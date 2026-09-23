import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeRunEvents } from '../src/fixtures/runEvents.js';
import { createApp } from './app.js';
import { MemoryStore } from './store.js';

let store: MemoryStore;
let app: ReturnType<typeof createApp>['app'];
beforeEach(() => { store = new MemoryStore(); app = createApp(store).app; });
afterEach(() => store.dispose());

describe('claims API', () => {
  it('filters claims and rejects an invalid status', async () => {
    const filtered = await request(app).get('/api/claims?status=reviewed').expect(200);
    expect(filtered.body.claims).toHaveLength(1);
    const invalid = await request(app).get('/api/claims?status=banana').expect(400);
    expect(invalid.body.error).toMatch(/Invalid status/);
  });

  it('validates and persists a reviewer decision against the current field version', async () => {
    for (const event of makeRunEvents('c-1042', 'test-run', 'normal').slice(0, 3)) store.applyEvent(event);
    await request(app).post('/api/claims/c-1042/decisions').send({ fieldId: 'incident_date', action: 'correct' }).expect(400);
    const response = await request(app).post('/api/claims/c-1042/decisions').send({ fieldId: 'incident_date', action: 'correct', value: '12 September 2026' }).expect(201);
    expect(response.body.decision).toMatchObject({ value: '12 September 2026', reviewedAgentVersion: 1 });
    expect(store.snapshot('c-1042')?.decisions).toHaveLength(1);
  });

  it('keeps running status until completion and then derives review status', async () => {
    const events = makeRunEvents('c-1042', 'test-run', 'normal');
    events.slice(0, 3).forEach((event) => store.applyEvent(event));
    await request(app).post('/api/claims/c-1042/decisions').send({ fieldId: 'incident_date', action: 'accept' }).expect(201);
    expect(store.snapshot('c-1042')?.claim.status).not.toBe('reviewed');
    events.slice(3).forEach((event) => store.applyEvent(event));
    expect(store.snapshot('c-1042')?.claim.status).toBe('needs_review');
  });

  it('becomes reviewed only when every finished field has a current decision', async () => {
    makeRunEvents('c-1042', 'test-run', 'normal').forEach((event) => store.applyEvent(event));
    for (const fieldId of ['incident_date', 'damage_amount', 'coverage']) {
      await request(app).post('/api/claims/c-1042/decisions').send({ fieldId, action: 'accept' }).expect(201);
    }
    expect(store.snapshot('c-1042')?.claim.status).toBe('reviewed');
  });

  it('preserves repeated decisions and treats the last one as current', async () => {
    makeRunEvents('c-1042', 'test-run', 'normal').forEach((event) => store.applyEvent(event));
    for (const payload of [
      { fieldId: 'damage_amount', action: 'correct', value: '€4,500' },
      { fieldId: 'damage_amount', action: 'override', value: '€4,400' },
      { fieldId: 'damage_amount', action: 'accept' },
    ]) await request(app).post('/api/claims/c-1042/decisions').send(payload).expect(201);
    const decisions = store.snapshot('c-1042')!.decisions;
    expect(decisions.map(({ action, value }) => ({ action, value }))).toEqual([
      { action: 'correct', value: '€4,500' },
      { action: 'override', value: '€4,400' },
      { action: 'accept', value: '€4,520' },
    ]);
  });

  it('can restart a failed fixture repeatedly from failed state', () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const snapshot = store.replay('c-1042', 'failed', 100_000);
      expect(snapshot?.claim.status).toBe('running');
      expect(snapshot?.run.fields).toEqual({});
      const runId = snapshot!.run.runId;
      makeRunEvents('c-1042', runId, 'failed').forEach((event) => store.applyEvent(event));
      const failed = store.snapshot('c-1042')!;
      expect(failed.claim.status).toBe('failed');
      expect(failed.run.status).toBe('failed');
      expect(Object.keys(failed.run.fields)).toHaveLength(2);
    }

    const normal = store.replay('c-1042', 'normal', 100_000)!;
    expect(normal.claim.status).toBe('running');
    makeRunEvents('c-1042', normal.run.runId, 'normal').forEach((event) => store.applyEvent(event));
    expect(store.snapshot('c-1042')?.run.status).toBe('finished');
    expect(store.snapshot('c-1042')?.claim.status).toBe('needs_review');

    const failedAgain = store.replay('c-1042', 'failed', 100_000)!;
    makeRunEvents('c-1042', failedAgain.run.runId, 'failed').forEach((event) => store.applyEvent(event));
    expect(store.snapshot('c-1042')?.claim.status).toBe('failed');
  });
});
