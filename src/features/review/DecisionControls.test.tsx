// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExtractedField } from '../../domain/types.js';
import { DecisionControls } from './DecisionControls';

const field: ExtractedField = { id: 'incident_date', label: 'Incident date', value: '10 September 2026', confidence: 0.72, source: { documentId: 'report', start: 0, end: 4 }, version: 1, revisions: [], confidenceChanges: [] };
afterEach(cleanup);

describe('reviewer decision controls', () => {
  it('submits a corrected value without changing agent state', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<DecisionControls field={field} hasDecision={false} busy={false} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Correct' }));
    fireEvent.change(screen.getByLabelText('Corrected value'), { target: { value: '12 September 2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save correct' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('correct', '12 September 2026'));
    expect(field.value).toBe('10 September 2026');
  });

  it('de-emphasizes actions after a decision but allows changing it', () => {
    render(<DecisionControls field={field} hasDecision busy={false} onSubmit={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Change decision' }));
    expect(screen.getByRole('button', { name: 'Accept' })).toBeTruthy();
  });
});
