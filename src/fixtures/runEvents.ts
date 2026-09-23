import type { ExtractedField, ReplayScenario, RunEvent } from '../domain/types.js';
import { citation } from './documents.js';

const time = (sequence: number) => new Date(Date.UTC(2026, 8, 23, 9, 0, sequence)).toISOString();
const field = (id: string, label: string, value: string, confidence: number, source: ReturnType<typeof citation>): ExtractedField => ({ id, label, value, confidence, source, version: 1, revisions: [], confidenceChanges: [] });

export function makeRunEvents(claimId: string, runId: string, scenario: ReplayScenario): RunEvent[] {
  let sequence = 0;
  const base = () => ({ claimId, runId, sequence: ++sequence, timestamp: time(sequence) });
  const events: RunEvent[] = [
    { ...base(), type: 'step_started', step: { id: 'read-report', label: 'Read incident report', status: 'running' } },
    { ...base(), type: 'summary_delta', delta: 'The claimant reported ' },
    { ...base(), type: 'field_extracted', field: field('incident_date', 'Incident date', '10 September 2026', 0.72, citation('police-report', '10 September 2026')) },
    { ...base(), type: 'summary_delta', delta: 'water damage to the kitchen ' },
    { ...base(), type: 'step_finished', stepId: 'read-report' },
    { ...base(), type: 'step_started', step: { id: 'read-invoice', label: 'Read repair estimate', status: 'running' } },
    { ...base(), type: 'field_extracted', field: field('damage_amount', 'Estimated damage', '€4,250', 0.75, citation('invoice', '€4,520')) },
    { ...base(), type: 'summary_delta', delta: 'after a pipe burst. ' },
    { ...base(), type: 'step_finished', stepId: 'read-invoice' },
    { ...base(), type: 'step_started', step: { id: 'check-policy', label: 'Check policy coverage', status: 'running' } },
  ];
  if (scenario === 'failed') return [...events, { ...base(), type: 'run_failed', stepId: 'check-policy', message: 'Policy service was unavailable. Completed findings are still available for review.' }];
  return [...events,
    { ...base(), type: 'field_extracted', field: field('coverage', 'Coverage', 'Covered — escape of water', 0.86, citation('policy', 'covers sudden escape of water and resulting damage')) },
    { ...base(), type: 'confidence_changed', fieldId: 'incident_date', confidence: 0.91 },
    { ...base(), type: 'field_revised', fieldId: 'damage_amount', value: '€4,520', confidence: 0.91, source: citation('invoice', '€4,520'), version: 2 },
    { ...base(), type: 'summary_delta', delta: 'The policy appears to cover the resulting damage.' },
    { ...base(), type: 'step_finished', stepId: 'check-policy' },
    { ...base(), type: 'step_started', step: { id: 'recommend', label: 'Prepare recommendation', status: 'running' } },
    { ...base(), type: 'step_finished', stepId: 'recommend' },
    { ...base(), type: 'run_finished' },
  ];
}
