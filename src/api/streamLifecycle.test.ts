import { describe, expect, it } from 'vitest';
import type { RunEvent } from '../domain/types.js';
import { createStreamLifecycle } from './streamLifecycle.js';

const terminalEvent = (type: 'run_finished' | 'run_failed'): RunEvent => ({ type, claimId: 'claim', runId: 'run', sequence: 1, timestamp: '2026-09-23T09:00:00Z', ...(type === 'run_failed' ? { message: 'Stopped' } : {}) } as RunEvent);

describe('stream lifecycle', () => {
  it.each(['run_finished', 'run_failed'] as const)('does not report expected close after %s', (type) => {
    const lifecycle = createStreamLifecycle();
    lifecycle.receive(terminalEvent(type));
    expect(lifecycle.shouldReportInterruption()).toBe(false);
  });

  it('reports a transport close before a terminal event', () => {
    expect(createStreamLifecycle().shouldReportInterruption()).toBe(true);
  });
});

