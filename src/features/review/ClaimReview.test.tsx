// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyRun } from '../../domain/runReducer.js';
import type { ClaimSnapshot } from '../../domain/types.js';
import { ClaimReview } from './ClaimReview';

afterEach(cleanup);
const snapshot: ClaimSnapshot = { claim: { id: 'c-1042', claimId: 'CLM-1042', claimantName: 'Maya de Vries', status: 'needs_review', priority: 'high', updatedAt: '2026-09-23T09:00:00Z' }, run: createEmptyRun('c-1042'), decisions: [], documents: [] };

describe('replay confirmation', () => {
  it('can cancel without replaying and confirms the chosen scenario', () => {
    const onReplay = vi.fn().mockResolvedValue(undefined);
    render(<ClaimReview snapshot={snapshot} onReplay={onReplay} onDecision={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Replay failed run' }));
    expect(screen.getByRole('alertdialog', { name: 'Replay failed run?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onReplay).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Replay normal run' }));
    expect(screen.getByRole('alertdialog', { name: 'Replay normal run?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    expect(onReplay).toHaveBeenCalledWith('normal');
  });

  it('returns to the queue through a semantic button', () => {
    const onBack = vi.fn();
    render(<ClaimReview snapshot={snapshot} onBack={onBack} onReplay={vi.fn()} onDecision={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '← Back to claims' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
