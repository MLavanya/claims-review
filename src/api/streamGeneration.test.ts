import { describe, expect, it, vi } from 'vitest';
import { createStreamGenerationGuard } from './streamGeneration.js';

describe('EventSource generation guard', () => {
  it('prevents callbacks from an older stream operating on the current stream', () => {
    const guard = createStreamGenerationGuard();
    const oldSession = guard.begin();
    const currentSession = guard.begin();
    const closeCurrent = vi.fn();
    const showConnectionError = vi.fn();

    if (oldSession.isCurrent()) closeCurrent();
    if (oldSession.isCurrent()) showConnectionError();

    expect(oldSession.isCurrent()).toBe(false);
    expect(currentSession.isCurrent()).toBe(true);
    expect(closeCurrent).not.toHaveBeenCalled();
    expect(showConnectionError).not.toHaveBeenCalled();
  });

  it('invalidates callbacks before a replacement replay is created', () => {
    const guard = createStreamGenerationGuard();
    const finishedRun = guard.begin();
    guard.invalidate();
    expect(finishedRun.isCurrent()).toBe(false);
    expect(guard.begin().isCurrent()).toBe(true);
  });
});

