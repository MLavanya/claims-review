import type { RunEvent } from '../domain/types.js';

export interface StreamLifecycle {
  receive(event: RunEvent): void;
  shouldReportInterruption(): boolean;
}

export function createStreamLifecycle(): StreamLifecycle {
  let terminalEventReceived = false;
  return {
    receive(event) {
      if (event.type === 'run_finished' || event.type === 'run_failed') terminalEventReceived = true;
    },
    shouldReportInterruption() { return !terminalEventReceived; },
  };
}

