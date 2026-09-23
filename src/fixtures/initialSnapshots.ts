import { applyRunEvent, createEmptyRun } from '../domain/runReducer.js';
import type { Claim, ClaimSnapshot, ReplayScenario, ReviewerDecision } from '../domain/types.js';
import { initialClaims } from './claims.js';
import { documents } from './documents.js';
import { makeRunEvents } from './runEvents.js';

function completedRun(claimId: string, scenario: ReplayScenario) {
  const runId = `fixture-${claimId}-${scenario}`;
  return makeRunEvents(claimId, runId, scenario).reduce(applyRunEvent, createEmptyRun(claimId, runId));
}

function claim(claimId: string): Claim {
  const match = initialClaims.find((item) => item.id === claimId);
  if (!match) throw new Error(`Unknown fixture claim: ${claimId}`);
  return match;
}

function reviewedDecisions(claimId: string, run: ReturnType<typeof completedRun>): ReviewerDecision[] {
  const decidedAt = '2026-09-22T14:10:00.000Z';
  return [
    { id: 'fixture-decision-date', claimId, fieldId: 'incident_date', action: 'accept', value: run.fields.incident_date!.value, decidedAt, reviewedAgentVersion: run.fields.incident_date!.version },
    { id: 'fixture-decision-amount', claimId, fieldId: 'damage_amount', action: 'correct', value: '€4,500', decidedAt, reviewedAgentVersion: run.fields.damage_amount!.version },
    { id: 'fixture-decision-coverage', claimId, fieldId: 'coverage', action: 'override', value: 'Covered — reviewer confirmed', decidedAt, reviewedAgentVersion: run.fields.coverage!.version },
  ];
}

const needsReviewRun = completedRun('c-1042', 'normal');
const reviewedRun = completedRun('c-1038', 'normal');
const failedRun = completedRun('c-1031', 'failed');

const snapshots: Record<string, ClaimSnapshot> = {
  'c-1042': { claim: claim('c-1042'), run: needsReviewRun, decisions: [], documents },
  'c-1038': { claim: claim('c-1038'), run: reviewedRun, decisions: reviewedDecisions('c-1038', reviewedRun), documents },
  'c-1031': { claim: claim('c-1031'), run: failedRun, decisions: [], documents },
};

export function initialClaimSnapshot(claimId: string): ClaimSnapshot | undefined {
  const snapshot = snapshots[claimId];
  return snapshot ? structuredClone(snapshot) : undefined;
}
