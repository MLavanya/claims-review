import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';
import { MemoryStore } from '../server/store.js';
import { makeRunEvents } from '../src/fixtures/runEvents.js';
import { createVercelHandler } from './index.js';

const route = (path: string, query = '') =>
  `/api/index?__api_path=${encodeURIComponent(path)}${query ? `&${query}` : ''}`;

let store: MemoryStore;
let handler: ReturnType<typeof createVercelHandler>;

beforeEach(() => {
  store = new MemoryStore();
  handler = createVercelHandler(createApp(store).app);
});

afterEach(() => store.dispose());

describe('Vercel API entrypoint', () => {
  it('forwards list, filter, and detail GET routes at every path depth', async () => {
    const queue = await request(handler).get(route('claims')).expect(200);
    expect(queue.body.claims).toHaveLength(3);

    const filtered = await request(handler).get(route('claims', 'status=reviewed')).expect(200);
    expect(filtered.body.claims).toHaveLength(1);
    await request(handler).get(route('claims', 'status=not-a-status')).expect(400);

    const detail = await request(handler).get(route('claims/c-1042')).expect(200);
    expect(detail.body).toMatchObject({
      claim: { id: 'c-1042' },
      run: { claimId: 'c-1042' },
    });
    expect(detail.body.documents).not.toHaveLength(0);
    await request(handler).get(route('claims/not-a-claim')).expect(404);
  });

  it.each(['accept', 'correct', 'override'] as const)(
    'forwards the %s reviewer decision POST with its JSON body',
    async (action) => {
      makeRunEvents('c-1042', 'decision-run', 'normal').slice(0, 3).forEach((event) => store.applyEvent(event));
      const body = {
        fieldId: 'incident_date',
        action,
        ...(action === 'accept' ? {} : { value: '12 September 2026' }),
      };

      const response = await request(handler)
        .post(route('claims/c-1042/decisions'))
        .send(body)
        .expect(201);

      expect(response.body.decision).toMatchObject({ fieldId: 'incident_date', action });
    },
  );

  it.each(['normal', 'failed'] as const)('forwards the %s replay POST', async (scenario) => {
    const response = await request(handler)
      .post(route('claims/c-1042/replay'))
      .send({ scenario })
      .expect(200);

    expect(response.body.claim.status).toBe('running');
    expect(response.body.run.runId).toBeTruthy();
  });

  it.each([
    ['normal', 'run_finished'],
    ['failed', 'run_failed'],
  ] as const)('streams the %s fixture through the SSE route until %s', async (scenario, terminalType) => {
    store.replay('c-1042', scenario, 1);

    const response = await request(handler)
      .get(route('claims/c-1042/events'))
      .expect('Content-Type', /text\/event-stream/)
      .expect('Cache-Control', 'no-cache, no-transform')
      .expect(200);

    expect(response.text).toContain('event: run_event');
    expect(response.text).toContain(`"type":"${terminalType}"`);
    expect(response.text).toContain('"type":"summary_delta"');
    expect(response.text).toContain('"type":"field_extracted"');

    const snapshot = store.snapshot('c-1042')!;
    if (scenario === 'normal') {
      expect(response.text).toContain('"type":"confidence_changed"');
      expect(response.text).toContain('"type":"field_revised"');
      expect(snapshot.claim.status).toBe('needs_review');
    } else {
      expect(snapshot.claim.status).toBe('failed');
      expect(Object.keys(snapshot.run.fields)).toHaveLength(2);
    }
  });

  it('keeps a reviewer decision separate when a later agent revision arrives', async () => {
    const events = makeRunEvents('c-1042', 'collision-run', 'normal');
    events.slice(0, 7).forEach((event) => store.applyEvent(event));

    await request(handler)
      .post(route('claims/c-1042/decisions'))
      .send({ fieldId: 'damage_amount', action: 'correct', value: '€4,400' })
      .expect(201);

    events.slice(7).forEach((event) => store.applyEvent(event));
    const snapshot = store.snapshot('c-1042')!;
    expect(snapshot.run.fields.damage_amount).toMatchObject({ value: '€4,520', version: 2 });
    expect(snapshot.decisions[0]).toMatchObject({ value: '€4,400', reviewedAgentVersion: 1 });
  });

  it('starts independent replacement runs and rejects malformed or unknown requests safely', async () => {
    const first = await request(handler).post(route('claims/c-1042/replay')).send({ scenario: 'failed' }).expect(200);
    const second = await request(handler).post(route('claims/c-1042/replay')).send({ scenario: 'normal' }).expect(200);
    expect(second.body.run.runId).not.toBe(first.body.run.runId);

    await request(handler)
      .post(route('claims/c-1042/replay'))
      .set('Content-Type', 'application/json')
      .send('{broken')
      .expect(400);
    await request(handler).post(route('claims/c-1042/replay')).send({ scenario: 'unknown' }).expect(400);
    await request(handler).post(route('claims/c-1042/decisions')).send({ fieldId: 'missing', action: 'accept' }).expect(404);
    const unsupportedMethod = await request(handler).put(route('claims/c-1042/replay')).expect(404);
    expect(unsupportedMethod.body).toEqual({ error: 'API route not found.' });
    await request(handler).get(route('claims/not-a-claim/events')).expect(404);
    await request(handler).get('/api/index?__api_path=../server/app').expect(404);

    const sameOriginResponse = await request(handler).get(route('claims')).expect(200);
    expect(sameOriginResponse.headers['access-control-allow-origin']).toBeUndefined();
  });
});
