import { describe, expect, it } from 'vitest';
import { latestDecisionsByField } from '../domain/runReducer.js';
import { initialClaims } from './claims.js';
import { initialClaimSnapshot } from './initialSnapshots.js';

describe('initial claim fixtures', () => {
  it('gives the needs-review claim completed AI output awaiting human decisions', () => {
    const snapshot = initialClaimSnapshot('c-1042')!;
    expect(snapshot.claim.status).toBe('needs_review');
    expect(snapshot.run.status).toBe('finished');
    expect(snapshot.run.summary).not.toBe('');
    expect(Object.keys(snapshot.run.fields)).toHaveLength(3);
    expect(snapshot.decisions).toEqual([]);
  });

  it('gives the reviewed claim completed AI output and current human decisions', () => {
    const snapshot = initialClaimSnapshot('c-1038')!;
    const latest = latestDecisionsByField(snapshot.decisions);
    expect(snapshot.claim.status).toBe('reviewed');
    expect(snapshot.run.status).toBe('finished');
    expect(snapshot.run.summary).not.toBe('');
    expect(Object.keys(snapshot.run.fields)).toHaveLength(3);
    expect(snapshot.decisions.map((decision) => decision.action)).toEqual(['accept', 'correct', 'override']);
    expect(Object.values(snapshot.run.fields).every((field) => latest[field.id]?.reviewedAgentVersion === field.version)).toBe(true);
  });

  it('gives the failed claim useful partial output and an authoritative failure', () => {
    const snapshot = initialClaimSnapshot('c-1031')!;
    expect(snapshot.claim.status).toBe('failed');
    expect(snapshot.run.status).toBe('failed');
    expect(snapshot.run.failure).toBeDefined();
    expect(snapshot.run.summary).not.toBe('');
    expect(Object.keys(snapshot.run.fields)).toHaveLength(2);
  });

  it('keeps every queue status consistent with its hydrated run and decisions', () => {
    for (const claim of initialClaims) {
      const snapshot = initialClaimSnapshot(claim.id)!;
      expect(snapshot.claim.status).toBe(claim.status);
      if (claim.status === 'reviewed' || claim.status === 'needs_review') expect(snapshot.run.status).toBe('finished');
      if (claim.status === 'failed') expect(snapshot.run.status).toBe('failed');
    }
  });
});
