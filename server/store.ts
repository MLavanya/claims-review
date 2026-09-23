import { randomUUID } from 'node:crypto';
import { applyRunEvent, createEmptyRun, latestDecisionsByField } from '../src/domain/runReducer.js';
import type { Claim, ClaimSnapshot, DecisionAction, ReplayScenario, ReviewerDecision, RunEvent } from '../src/domain/types.js';
import { initialClaims } from '../src/fixtures/claims.js';
import { documents } from '../src/fixtures/documents.js';
import { makeRunEvents } from '../src/fixtures/runEvents.js';

type Listener = (event: RunEvent) => void;

export class MemoryStore {
  private claims = structuredClone(initialClaims);
  private runs = new Map<string, ReturnType<typeof createEmptyRun>>();
  private decisions: ReviewerDecision[] = [];
  private listeners = new Map<string, Set<Listener>>();
  private timers = new Map<string, NodeJS.Timeout[]>();

  constructor() { for (const claim of this.claims) this.runs.set(claim.id, createEmptyRun(claim.id)); }

  listClaims(status?: Claim['status']): Claim[] {
    return this.claims.filter((claim) => !status || claim.status === status).map((claim) => ({ ...claim }));
  }

  snapshot(claimId: string): ClaimSnapshot | undefined {
    const claim = this.claims.find((item) => item.id === claimId);
    const run = this.runs.get(claimId);
    if (!claim || !run) return undefined;
    return { claim: structuredClone(claim), run: structuredClone(run), decisions: structuredClone(this.decisions.filter((item) => item.claimId === claimId)), documents };
  }

  subscribe(claimId: string, listener: Listener): () => void {
    const listeners = this.listeners.get(claimId) ?? new Set();
    listeners.add(listener);
    this.listeners.set(claimId, listeners);
    return () => listeners.delete(listener);
  }

  replay(claimId: string, scenario: ReplayScenario, delay = 650): ClaimSnapshot | undefined {
    const claim = this.claims.find((item) => item.id === claimId);
    if (!claim) return undefined;
    for (const timer of this.timers.get(claimId) ?? []) clearTimeout(timer);
    const runId = randomUUID();
    this.runs.set(claimId, createEmptyRun(claimId, runId));
    this.decisions = this.decisions.filter((item) => item.claimId !== claimId);
    claim.status = 'running';
    claim.updatedAt = new Date().toISOString();
    const timers = makeRunEvents(claimId, runId, scenario).map((event, index) => setTimeout(() => this.applyEvent(event), delay * (index + 1)));
    this.timers.set(claimId, timers);
    return this.snapshot(claimId);
  }

  applyEvent(event: RunEvent): void {
    const run = this.runs.get(event.claimId);
    const claim = this.claims.find((item) => item.id === event.claimId);
    if (!run || !claim) return;
    const next = applyRunEvent(run, event);
    if (next === run) return;
    this.runs.set(event.claimId, next);
    claim.updatedAt = event.timestamp;
    if (event.type === 'run_failed') claim.status = 'failed';
    if (event.type === 'run_finished') this.updateReviewStatus(event.claimId);
    for (const listener of this.listeners.get(event.claimId) ?? []) listener(event);
  }

  addDecision(claimId: string, fieldId: string, action: DecisionAction, suppliedValue?: string): ReviewerDecision | undefined {
    const run = this.runs.get(claimId);
    const field = run?.fields[fieldId];
    if (!field) return undefined;
    const decision: ReviewerDecision = {
      id: randomUUID(), claimId, fieldId, action,
      value: action === 'accept' ? field.value : suppliedValue ?? '',
      decidedAt: new Date().toISOString(), reviewedAgentVersion: field.version,
    };
    this.decisions.push(decision);
    this.updateReviewStatus(claimId);
    return structuredClone(decision);
  }

  private updateReviewStatus(claimId: string): void {
    const claim = this.claims.find((item) => item.id === claimId);
    const run = this.runs.get(claimId);
    if (!claim || !run || run.status === 'running' || run.status === 'idle') return;
    if (run.status === 'failed') { claim.status = 'failed'; return; }
    const latest = latestDecisionsByField(this.decisions.filter((item) => item.claimId === claimId));
    const fields = Object.values(run.fields);
    claim.status = fields.length > 0 && fields.every((field) => latest[field.id]?.reviewedAgentVersion === field.version) ? 'reviewed' : 'needs_review';
  }

  dispose(): void { for (const timers of this.timers.values()) for (const timer of timers) clearTimeout(timer); }
}

