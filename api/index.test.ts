import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { applyRunEvent, createEmptyRun } from '../src/domain/runReducer.js';
import type { AgentRun, ReviewerDecision, RunEvent } from '../src/domain/types.js';
import { createApp } from '../server/app.js';
import { createVercelHandler } from './index.js';

const route = (path: string, query = '') => `/api/index?__api_path=${encodeURIComponent(path)}${query ? `&${query}` : ''}`;
const independentHandler = () => createVercelHandler(createApp({ eventDelay: 1 }).app);
const eventsFrom = (text: string) => text.split('\n').filter((line) => line.startsWith('data: ')).map((line) => JSON.parse(line.slice(6)) as RunEvent);
const runFrom = (events: RunEvent[]): AgentRun => events.reduce(applyRunEvent, createEmptyRun('c-1042', events[0]?.runId));

describe('Vercel API entrypoint', () => {
  it('forwards list, filter, and detail routes at every path depth', async () => {
    expect((await request(independentHandler()).get(route('claims')).expect(200)).body.claims).toHaveLength(3);
    expect((await request(independentHandler()).get(route('claims', 'status=reviewed')).expect(200)).body.claims).toHaveLength(1);
    await request(independentHandler()).get(route('claims', 'status=invalid')).expect(400);
    const detail = await request(independentHandler()).get(route('claims/c-1042')).expect(200);
    expect(detail.body).toMatchObject({ claim: { id: 'c-1042' }, run: { claimId: 'c-1042' } });
    await request(independentHandler()).get(route('claims/missing')).expect(404);
  });

  it.each(['normal', 'failed'] as const)('runs the %s replay and SSE on separate function instances', async (scenario) => {
    const replay = await request(independentHandler()).post(route('claims/c-1042/replay')).send({ scenario }).expect(200);
    expect(replay.body).toMatchObject({ claim: { status: 'running' }, run: { status: 'running' }, decisions: [] });

    const stream = await request(independentHandler())
      .get(route('claims/c-1042/events', `runId=${replay.body.run.runId}&scenario=${scenario}`))
      .expect('Content-Type', /text\/event-stream/)
      .expect('Cache-Control', 'no-cache, no-transform')
      .expect(200);
    const events = eventsFrom(stream.text);
    expect(events[0]?.runId).toBe(replay.body.run.runId);
    expect(events.at(-1)?.type).toBe(scenario === 'normal' ? 'run_finished' : 'run_failed');
    const run = runFrom(events);
    expect(run.status).toBe(scenario === 'normal' ? 'finished' : 'failed');
    expect(Object.keys(run.fields)).toHaveLength(scenario === 'normal' ? 3 : 2);
  });

  it.each(['accept', 'correct', 'override'] as const)('submits %s through another function instance', async (action) => {
    const replay = await request(independentHandler()).post(route('claims/c-1042/replay')).send({ scenario: 'normal' }).expect(200);
    const stream = await request(independentHandler()).get(route('claims/c-1042/events', `runId=${replay.body.run.runId}&scenario=normal`)).expect(200);
    const run = runFrom(eventsFrom(stream.text));
    const body = { fieldId: 'incident_date', action, value: action === 'accept' ? undefined : '12 September 2026', field: run.fields.incident_date, run, decisions: [] };
    const response = await request(independentHandler()).post(route('claims/c-1042/decisions')).send(body).expect(201);
    expect(response.body.decision).toMatchObject({ fieldId: 'incident_date', action });
    expect(response.body.claim.status).toBe('needs_review');
  });

  it('moves a previously reviewed claim to running without consulting instance memory', async () => {
    const before = await request(independentHandler()).get(route('claims', 'status=reviewed')).expect(200);
    expect(before.body.claims.some((claim: { id: string }) => claim.id === 'c-1038')).toBe(true);
    const replay = await request(independentHandler()).post(route('claims/c-1038/replay')).send({ scenario: 'normal' }).expect(200);
    expect(replay.body.claim.status).toBe('running');
    expect(replay.body.run.status).toBe('running');
  });

  it('preserves a human decision when later events revise the AI field', async () => {
    const replay = await request(independentHandler()).post(route('claims/c-1042/replay')).send({ scenario: 'normal' }).expect(200);
    const stream = await request(independentHandler()).get(route('claims/c-1042/events', `runId=${replay.body.run.runId}&scenario=normal`)).expect(200);
    const events = eventsFrom(stream.text);
    const partialRun = runFrom(events.slice(0, 7));
    const decisionResponse = await request(independentHandler()).post(route('claims/c-1042/decisions')).send({
      fieldId: 'damage_amount', action: 'correct', value: '€4,400', field: partialRun.fields.damage_amount, run: partialRun, decisions: [],
    }).expect(201);
    const finishedRun = events.slice(7).reduce(applyRunEvent, partialRun);
    expect(decisionResponse.body.decision).toMatchObject({ value: '€4,400', reviewedAgentVersion: 1 });
    expect(finishedRun.fields.damage_amount).toMatchObject({ value: '€4,520', version: 2 });
  });

  it('derives reviewed across separate decision requests from supplied session state', async () => {
    const replay = await request(independentHandler()).post(route('claims/c-1042/replay')).send({ scenario: 'normal' }).expect(200);
    const stream = await request(independentHandler()).get(route('claims/c-1042/events', `runId=${replay.body.run.runId}&scenario=normal`)).expect(200);
    const run = runFrom(eventsFrom(stream.text));
    let decisions: ReviewerDecision[] = [];
    for (const fieldId of Object.keys(run.fields)) {
      const response = await request(independentHandler()).post(route('claims/c-1042/decisions')).send({ fieldId, action: 'accept', field: run.fields[fieldId], run, decisions }).expect(201);
      decisions = [...decisions, response.body.decision];
      if (fieldId === Object.keys(run.fields).at(-1)) expect(response.body.claim.status).toBe('reviewed');
    }
  });

  it('rejects malformed, unsupported, and traversal requests safely', async () => {
    await request(independentHandler()).post(route('claims/c-1042/replay')).send({ scenario: 'unknown' }).expect(400);
    await request(independentHandler()).get(route('claims/c-1042/events')).expect(400);
    await request(independentHandler()).post(route('claims/c-1042/decisions')).send({ fieldId: 'missing', action: 'accept' }).expect(400);
    expect((await request(independentHandler()).put(route('claims/c-1042/replay')).expect(404)).body).toEqual({ error: 'API route not found.' });
    await request(independentHandler()).get('/api/index?__api_path=../server/app').expect(404);
  });
});
