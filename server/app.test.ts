import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { applyRunEvent, createEmptyRun } from '../src/domain/runReducer.js';
import type { AgentRun, ReviewerDecision, RunEvent } from '../src/domain/types.js';
import { makeRunEvents } from '../src/fixtures/runEvents.js';
import { createApp } from './app.js';

const newApp = () => createApp({ eventDelay: 1 }).app;
const runFrom = (events: RunEvent[]): AgentRun => events.reduce(applyRunEvent, createEmptyRun('c-1042', events[0]?.runId));
const decisionBody = (run: AgentRun, decisions: ReviewerDecision[], fieldId: string, action = 'accept', value?: string) => ({ fieldId, action, value, field: run.fields[fieldId], run, decisions });

describe('stateless claims API', () => {
  it('filters claims, hydrates a fixture, and validates errors', async () => {
    expect((await request(newApp()).get('/api/claims?status=reviewed').expect(200)).body.claims).toHaveLength(1);
    await request(newApp()).get('/api/claims?status=banana').expect(400);
    const detail = await request(newApp()).get('/api/claims/c-1042').expect(200);
    expect(detail.body).toMatchObject({ claim: { id: 'c-1042', status: 'needs_review' }, run: { status: 'finished' }, decisions: [] });
    expect(detail.body.documents).not.toHaveLength(0);
    await request(newApp()).get('/api/claims/missing').expect(404);
  });

  it('starts every replay as a fresh running snapshot without shared memory', async () => {
    const reviewedFixture = await request(newApp()).get('/api/claims/c-1038').expect(200);
    expect(reviewedFixture.body.claim.status).toBe('reviewed');
    const first = await request(newApp()).post('/api/claims/c-1038/replay').send({ scenario: 'normal' }).expect(200);
    const second = await request(newApp()).post('/api/claims/c-1038/replay').send({ scenario: 'normal' }).expect(200);
    expect(first.body.claim.status).toBe('running');
    expect(first.body.run.status).toBe('running');
    expect(first.body.decisions).toEqual([]);
    expect(second.body.run.runId).not.toBe(first.body.run.runId);
  });

  it('streams a requested run independently of the replay instance', async () => {
    const replay = await request(newApp()).post('/api/claims/c-1042/replay').send({ scenario: 'normal' }).expect(200);
    const stream = await request(newApp()).get(`/api/claims/c-1042/events?runId=${replay.body.run.runId}&scenario=normal`).expect('Content-Type', /text\/event-stream/).expect(200);
    expect(stream.text).toContain(`"runId":"${replay.body.run.runId}"`);
    expect(stream.text).toContain('"type":"run_finished"');
    expect(stream.text).toContain('"type":"field_revised"');
  });

  it('derives reviewed only after every current field is decided across independent requests', async () => {
    const run = runFrom(makeRunEvents('c-1042', 'finished-run', 'normal'));
    let decisions: ReviewerDecision[] = [];
    for (const fieldId of ['incident_date', 'damage_amount', 'coverage']) {
      const result = await request(newApp()).post('/api/claims/c-1042/decisions').send(decisionBody(run, decisions, fieldId)).expect(201);
      decisions = [...decisions, result.body.decision];
      expect(result.body.claim.status).toBe(fieldId === 'coverage' ? 'reviewed' : 'needs_review');
    }
    expect(decisions).toHaveLength(3);
  });

  it('keeps a running decision separate from a later AI revision', async () => {
    const events = makeRunEvents('c-1042', 'collision-run', 'normal');
    const partialRun = runFrom(events.slice(0, 7));
    const response = await request(newApp()).post('/api/claims/c-1042/decisions').send(decisionBody(partialRun, [], 'damage_amount', 'correct', '€4,400')).expect(201);
    expect(response.body.claim.status).toBe('running');
    expect(response.body.decision).toMatchObject({ value: '€4,400', reviewedAgentVersion: 1 });
    const finishedRun = events.slice(7).reduce(applyRunEvent, partialRun);
    expect(finishedRun.fields.damage_amount).toMatchObject({ value: '€4,520', version: 2 });
    expect(response.body.decision).toMatchObject({ value: '€4,400', reviewedAgentVersion: 1 });
  });

  it('streams failed partial work and validates stateless decision context', async () => {
    const replay = await request(newApp()).post('/api/claims/c-1042/replay').send({ scenario: 'failed' }).expect(200);
    const stream = await request(newApp()).get(`/api/claims/c-1042/events?runId=${replay.body.run.runId}&scenario=failed`).expect(200);
    const events = stream.text.split('\n').filter((line) => line.startsWith('data: ')).map((line) => JSON.parse(line.slice(6)) as RunEvent);
    const run = runFrom(events);
    expect(run.status).toBe('failed');
    expect(Object.keys(run.fields)).toHaveLength(2);
    await request(newApp()).post('/api/claims/c-1042/decisions').send({ fieldId: 'incident_date', action: 'accept' }).expect(400);
    await request(newApp()).get('/api/claims/c-1042/events').expect(400);
  });
});
