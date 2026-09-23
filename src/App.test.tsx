// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Claim, ClaimSnapshot, ReplayScenario, RunEvent } from './domain/types.js';

interface ControlledConnection {
  onEvent: (event: RunEvent) => void;
  onError: () => void;
  close: ReturnType<typeof vi.fn>;
}

const api = vi.hoisted(() => ({
  connections: [] as ControlledConnection[],
  getClaims: vi.fn(),
  getClaim: vi.fn(),
  replay: vi.fn(),
  decide: vi.fn(),
}));

vi.mock('./api/client', () => ({
  getClaims: api.getClaims,
  getClaim: api.getClaim,
  replay: api.replay,
  decide: api.decide,
  eventStream: (_claimId: string, onEvent: (event: RunEvent) => void, onError: () => void) => {
    const connection = { onEvent, onError, close: vi.fn() };
    api.connections.push(connection);
    return connection as unknown as EventSource;
  },
}));

import App from './App';

const claim: Claim = { id: 'c-1042', claimId: 'CLM-1042', claimantName: 'Maya de Vries', status: 'needs_review', priority: 'high', updatedAt: '2026-09-23T09:00:00Z' };
const snapshot = (runId: string, status: Claim['status'] = 'running'): ClaimSnapshot => ({
  claim: { ...claim, status },
  run: { claimId: claim.id, runId, status: status === 'running' ? 'running' : 'idle', steps: [], summary: '', fields: {}, lastSequence: 0 },
  decisions: [],
  documents: [],
});

beforeEach(() => {
  api.connections.length = 0;
  api.getClaims.mockResolvedValue([claim]);
  api.getClaim.mockResolvedValue(snapshot('hydrated', 'needs_review'));
  api.replay.mockImplementation((_id: string, scenario: ReplayScenario) => Promise.resolve(snapshot(`${scenario}-replacement`)));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('App run connection lifecycle', () => {
  it('ignores terminal and error callbacks from a replaced EventSource', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'Replay normal run' });

    fireEvent.click(screen.getByRole('button', { name: 'Replay normal run' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    await waitFor(() => expect(api.connections).toHaveLength(1));
    const oldConnection = api.connections[0]!;

    fireEvent.click(screen.getByRole('button', { name: 'Replay failed run' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    await waitFor(() => expect(api.connections).toHaveLength(2));
    const currentConnection = api.connections[1]!;
    const oldCloseCount = oldConnection.close.mock.calls.length;

    oldConnection.onEvent({ type: 'run_failed', claimId: claim.id, runId: 'normal-replacement', sequence: 99, timestamp: '2026-09-23T09:01:00Z', message: 'Old failure' });
    oldConnection.onError();

    expect(oldConnection.close).toHaveBeenCalledTimes(oldCloseCount);
    expect(currentConnection.close).not.toHaveBeenCalled();
    expect(screen.queryByText('Agent run stopped')).toBeNull();
    expect(screen.queryByText(/live connection was interrupted/i)).toBeNull();
    expect(screen.getAllByText('Agent running').length).toBeGreaterThan(0);
  });
});
