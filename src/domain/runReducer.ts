import type { AgentRun, RunEvent } from './types.js';

export function createEmptyRun(claimId: string, runId = 'not-started'): AgentRun {
  return { claimId, runId, status: 'idle', steps: [], summary: '', fields: {}, lastSequence: 0 };
}

function unreachable(value: never): never { throw new Error(`Unhandled run event: ${JSON.stringify(value)}`); }

export function applyRunEvent(run: AgentRun, event: RunEvent): AgentRun {
  if (event.runId !== run.runId && run.runId !== 'not-started') return run;
  if (event.runId === run.runId && event.sequence <= run.lastSequence) return run;
  const base = { ...run, runId: event.runId, status: run.status === 'idle' ? 'running' as const : run.status, lastSequence: event.sequence };
  switch (event.type) {
    case 'step_started':
      return { ...base, steps: [...base.steps.filter((step) => step.id !== event.step.id), { ...event.step, status: 'running' }] };
    case 'step_finished':
      return { ...base, steps: base.steps.map((step) => step.id === event.stepId ? { ...step, status: 'completed' } : step) };
    case 'summary_delta': return { ...base, summary: base.summary + event.delta };
    case 'field_extracted': return { ...base, fields: { ...base.fields, [event.field.id]: event.field } };
    case 'field_revised': {
      const field = base.fields[event.fieldId];
      if (!field) return base;
      return { ...base, fields: { ...base.fields, [event.fieldId]: {
        ...field,
        value: event.value,
        confidence: event.confidence,
        source: event.source,
        version: event.version,
        revisions: [...field.revisions, { value: field.value, confidence: field.confidence, source: field.source, version: field.version, changedAt: event.timestamp }],
      } } };
    }
    case 'confidence_changed': {
      const field = base.fields[event.fieldId];
      if (!field) return base;
      return { ...base, fields: { ...base.fields, [event.fieldId]: { ...field, confidence: event.confidence, version: field.version + 1, confidenceChanges: [...field.confidenceChanges, { from: field.confidence, to: event.confidence, changedAt: event.timestamp }] } } };
    }
    case 'run_finished': return { ...base, status: 'finished', finishedAt: event.timestamp };
    case 'run_failed': return { ...base, status: 'failed', failure: { message: event.message, failedAt: event.timestamp }, steps: base.steps.map((step) => step.id === event.stepId ? { ...step, status: 'failed' } : step) };
    default: return unreachable(event);
  }
}

export function latestDecisionsByField<T extends { fieldId: string }>(decisions: T[]): Record<string, T> {
  return Object.fromEntries(decisions.map((decision) => [decision.fieldId, decision]));
}
