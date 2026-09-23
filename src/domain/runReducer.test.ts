import { describe, expect, it } from 'vitest';
import { makeRunEvents } from '../fixtures/runEvents.js';
import type { ReviewerDecision } from './types.js';
import { applyRunEvent, createEmptyRun } from './runReducer.js';

describe('agent run transitions', () => {
  it('extracts a field from a typed event', () => {
    const event = makeRunEvents('c-1042', 'run-1', 'normal').find((item) => item.type === 'field_extracted');
    if (!event) throw new Error('fixture missing extraction');
    const run = applyRunEvent(createEmptyRun('c-1042', 'run-1'), event);
    expect(run.fields.incident_date?.value).toBe('10 September 2026');
  });

  it('revises agent state and retains the prior version', () => {
    const events = makeRunEvents('c-1042', 'run-1', 'normal');
    const run = events.reduce(applyRunEvent, createEmptyRun('c-1042', 'run-1'));
    expect(run.fields.damage_amount).toMatchObject({ value: '€4,520', version: 2 });
    expect(run.fields.damage_amount?.revisions[0]).toMatchObject({ value: '€4,250', version: 1 });
  });

  it('makes confidence movement visible in lightweight history', () => {
    const run = makeRunEvents('c-1042', 'run-1', 'normal').reduce(applyRunEvent, createEmptyRun('c-1042', 'run-1'));
    expect(run.fields.incident_date?.confidenceChanges).toEqual([expect.objectContaining({ from: 0.72, to: 0.91 })]);
  });

  it('does not destroy a separate human decision after a later revision', () => {
    const events = makeRunEvents('c-1042', 'run-1', 'normal');
    const initial = events.slice(0, 7).reduce(applyRunEvent, createEmptyRun('c-1042', 'run-1'));
    const decision: ReviewerDecision = { id: 'd-1', claimId: 'c-1042', fieldId: 'damage_amount', action: 'accept', value: '€4,250', decidedAt: '2026-09-23T09:00:08Z', reviewedAgentVersion: 1 };
    const revised = events.slice(7).reduce(applyRunEvent, initial);
    expect(decision.value).toBe('€4,250');
    expect(revised.fields.damage_amount?.value).toBe('€4,520');
    expect(revised.fields.damage_amount!.version).toBeGreaterThan(decision.reviewedAgentVersion);
  });

  it('preserves useful output when the run fails', () => {
    const run = makeRunEvents('c-1042', 'run-fail', 'failed').reduce(applyRunEvent, createEmptyRun('c-1042', 'run-fail'));
    expect(run.status).toBe('failed');
    expect(Object.keys(run.fields)).toHaveLength(2);
    expect(run.summary).not.toBe('');
  });
});
