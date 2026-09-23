import express from 'express';
import { claimStatuses, type ClaimStatus, type DecisionAction, type ReplayScenario } from '../src/domain/types.js';
import { MemoryStore } from './store.js';

export function createApp(store = new MemoryStore()) {
  const app = express();
  app.use(express.json());

  app.get('/api/claims', (request, response) => {
    const status = request.query.status;
    if (status !== undefined && (typeof status !== 'string' || !claimStatuses.includes(status as ClaimStatus))) {
      response.status(400).json({ error: `Invalid status. Use one of: ${claimStatuses.join(', ')}.` }); return;
    }
    response.json({ claims: store.listClaims(status as ClaimStatus | undefined) });
  });

  app.get('/api/claims/:claimId', (request, response) => {
    const snapshot = store.snapshot(request.params.claimId);
    if (!snapshot) { response.status(404).json({ error: 'Claim not found.' }); return; }
    response.json(snapshot);
  });

  app.get('/api/claims/:claimId/events', (request, response) => {
    if (!store.snapshot(request.params.claimId)) { response.status(404).json({ error: 'Claim not found.' }); return; }
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();
    response.write(': connected\n\n');
    const unsubscribe = store.subscribe(request.params.claimId, (event) => {
      response.write(`id: ${event.sequence}\nevent: run_event\ndata: ${JSON.stringify(event)}\n\n`);
      if (event.type === 'run_finished' || event.type === 'run_failed') response.end();
    });
    request.on('close', unsubscribe);
  });

  app.post('/api/claims/:claimId/replay', (request, response) => {
    const scenario = request.body?.scenario as ReplayScenario | undefined;
    if (scenario !== 'normal' && scenario !== 'failed') { response.status(400).json({ error: 'Scenario must be normal or failed.' }); return; }
    const snapshot = store.replay(request.params.claimId, scenario);
    if (!snapshot) { response.status(404).json({ error: 'Claim not found.' }); return; }
    response.json(snapshot);
  });

  app.post('/api/claims/:claimId/decisions', (request, response) => {
    const { fieldId, action, value } = request.body ?? {};
    const actions: DecisionAction[] = ['accept', 'correct', 'override'];
    if (typeof fieldId !== 'string' || !actions.includes(action)) { response.status(400).json({ error: 'A valid fieldId and action are required.' }); return; }
    if (action !== 'accept' && (typeof value !== 'string' || !value.trim())) { response.status(400).json({ error: 'Correct and override require a value.' }); return; }
    const decision = store.addDecision(request.params.claimId, fieldId, action, typeof value === 'string' ? value.trim() : undefined);
    if (!decision) { response.status(404).json({ error: 'Claim or extracted field not found.' }); return; }
    response.status(201).json({ decision, claim: store.snapshot(request.params.claimId)?.claim });
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

  return { app, store };
}
