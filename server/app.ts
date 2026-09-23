import { randomUUID } from 'node:crypto';
import express from 'express';
import { createEmptyRun, latestDecisionsByField } from '../src/domain/runReducer.js';
import {
  claimStatuses,
  type AgentRun,
  type Claim,
  type ClaimSnapshot,
  type ClaimStatus,
  type DecisionAction,
  type ExtractedField,
  type ReplayScenario,
  type ReviewerDecision,
} from '../src/domain/types.js';
import { initialClaims } from '../src/fixtures/claims.js';
import { documents } from '../src/fixtures/documents.js';
import { initialClaimSnapshot } from '../src/fixtures/initialSnapshots.js';
import { makeRunEvents } from '../src/fixtures/runEvents.js';

interface AppOptions { eventDelay?: number }

const findClaim = (claimId: string) => initialClaims.find((claim) => claim.id === claimId);
const cloneClaim = (claim: Claim): Claim => structuredClone(claim);

function isField(value: unknown): value is ExtractedField {
  if (!value || typeof value !== 'object') return false;
  const field = value as Partial<ExtractedField>;
  return typeof field.id === 'string' && typeof field.value === 'string' && typeof field.version === 'number';
}

function isRun(value: unknown): value is AgentRun {
  if (!value || typeof value !== 'object') return false;
  const run = value as Partial<AgentRun>;
  return typeof run.runId === 'string' && ['idle', 'running', 'finished', 'failed'].includes(run.status ?? '') && Boolean(run.fields && typeof run.fields === 'object');
}

function statusAfterDecision(run: AgentRun, decisions: ReviewerDecision[]): ClaimStatus {
  if (run.status === 'running') return 'running';
  if (run.status === 'failed') return 'failed';
  if (run.status !== 'finished') return 'needs_review';
  const latest = latestDecisionsByField(decisions);
  const fields = Object.values(run.fields);
  return fields.length > 0 && fields.every((field) => latest[field.id]?.reviewedAgentVersion === field.version)
    ? 'reviewed'
    : 'needs_review';
}

export function createApp({ eventDelay = 650 }: AppOptions = {}) {
  const app = express();
  app.use(express.json());

  app.get('/api/claims', (request, response) => {
    const status = request.query.status;
    if (status !== undefined && (typeof status !== 'string' || !claimStatuses.includes(status as ClaimStatus))) {
      response.status(400).json({ error: `Invalid status. Use one of: ${claimStatuses.join(', ')}.` }); return;
    }
    response.json({ claims: initialClaims.filter((claim) => !status || claim.status === status).map(cloneClaim) });
  });

  app.get('/api/claims/:claimId', (request, response) => {
    const snapshot = initialClaimSnapshot(request.params.claimId);
    if (!snapshot) { response.status(404).json({ error: 'Claim not found.' }); return; }
    response.json(snapshot);
  });

  app.get('/api/claims/:claimId/events', (request, response) => {
    const claim = findClaim(request.params.claimId);
    const runId = request.query.runId;
    const scenario = request.query.scenario as ReplayScenario | undefined;
    if (!claim) { response.status(404).json({ error: 'Claim not found.' }); return; }
    if (typeof runId !== 'string' || !runId || (scenario !== 'normal' && scenario !== 'failed')) {
      response.status(400).json({ error: 'A runId and valid scenario are required.' }); return;
    }

    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();
    response.write(': connected\n\n');

    const timers = makeRunEvents(claim.id, runId, scenario).map((event, index) => setTimeout(() => {
      response.write(`id: ${event.sequence}\nevent: run_event\ndata: ${JSON.stringify(event)}\n\n`);
      if (event.type === 'run_finished' || event.type === 'run_failed') response.end();
    }, eventDelay * (index + 1)));

    request.on('close', () => timers.forEach(clearTimeout));
  });

  app.post('/api/claims/:claimId/replay', (request, response) => {
    const claim = findClaim(request.params.claimId);
    const scenario = request.body?.scenario as ReplayScenario | undefined;
    if (scenario !== 'normal' && scenario !== 'failed') { response.status(400).json({ error: 'Scenario must be normal or failed.' }); return; }
    if (!claim) { response.status(404).json({ error: 'Claim not found.' }); return; }
    const now = new Date().toISOString();
    const runId = randomUUID();
    response.json({
      claim: { ...cloneClaim(claim), status: 'running', updatedAt: now },
      run: { ...createEmptyRun(claim.id, runId), status: 'running' },
      decisions: [],
      documents,
    } satisfies ClaimSnapshot);
  });

  app.post('/api/claims/:claimId/decisions', (request, response) => {
    const claim = findClaim(request.params.claimId);
    const { fieldId, action, value, field, run, decisions } = request.body ?? {};
    const actions: DecisionAction[] = ['accept', 'correct', 'override'];
    if (!claim) { response.status(404).json({ error: 'Claim not found.' }); return; }
    if (typeof fieldId !== 'string' || !actions.includes(action)) { response.status(400).json({ error: 'A valid fieldId and action are required.' }); return; }
    if (action !== 'accept' && (typeof value !== 'string' || !value.trim())) { response.status(400).json({ error: 'Correct and override require a value.' }); return; }
    if (!isField(field) || field.id !== fieldId || !isRun(run) || !Array.isArray(decisions)) {
      response.status(400).json({ error: 'Current run and field context are required.' }); return;
    }

    const decision: ReviewerDecision = {
      id: randomUUID(),
      claimId: claim.id,
      fieldId,
      action,
      value: action === 'accept' ? field.value : value.trim(),
      decidedAt: new Date().toISOString(),
      reviewedAgentVersion: field.version,
    };
    const nextDecisions = [...(decisions as ReviewerDecision[]), decision];
    response.status(201).json({
      decision,
      claim: { ...cloneClaim(claim), status: statusAfterDecision(run, nextDecisions), updatedAt: decision.decidedAt },
    });
  });

  app.use('/api', (_request, response) => {
    response.status(404).json({ error: 'API route not found.' });
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof SyntaxError && 'body' in error) {
      response.status(400).json({ error: 'Request body must be valid JSON.' });
      return;
    }
    console.error(error);
    response.status(500).json({ error: 'An unexpected server error occurred.' });
  });

  return { app };
}
