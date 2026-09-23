export type ClaimStatus = 'running' | 'needs_review' | 'reviewed' | 'failed';
export type Priority = 'high' | 'medium' | 'low';
export type RunStatus = 'idle' | 'running' | 'finished' | 'failed';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';
export type DecisionAction = 'accept' | 'correct' | 'override';
export type ReplayScenario = 'normal' | 'failed';

export interface Claim {
  id: string;
  claimId: string;
  claimantName: string;
  status: ClaimStatus;
  priority: Priority;
  updatedAt: string;
}

export interface AgentStep { id: string; label: string; status: StepStatus }
export interface SourceCitation { documentId: string; start: number; end: number }
export interface FieldRevision { value: string; confidence: number; source: SourceCitation; version: number; changedAt: string }
export interface ConfidenceChange { from: number; to: number; changedAt: string }

export interface ExtractedField {
  id: string;
  label: string;
  value: string;
  confidence: number;
  source: SourceCitation;
  version: number;
  revisions: FieldRevision[];
  confidenceChanges: ConfidenceChange[];
}

export interface AgentRun {
  claimId: string;
  runId: string;
  status: RunStatus;
  steps: AgentStep[];
  summary: string;
  fields: Record<string, ExtractedField>;
  lastSequence: number;
  finishedAt?: string;
  failure?: { message: string; failedAt: string };
}

export interface ReviewerDecision {
  id: string;
  claimId: string;
  fieldId: string;
  action: DecisionAction;
  value: string;
  decidedAt: string;
  reviewedAgentVersion: number;
}

interface EventBase { claimId: string; runId: string; sequence: number; timestamp: string }
export type RunEvent =
  | (EventBase & { type: 'step_started'; step: AgentStep })
  | (EventBase & { type: 'step_finished'; stepId: string })
  | (EventBase & { type: 'summary_delta'; delta: string })
  | (EventBase & { type: 'field_extracted'; field: ExtractedField })
  | (EventBase & { type: 'field_revised'; fieldId: string; value: string; confidence: number; source: SourceCitation; version: number })
  | (EventBase & { type: 'confidence_changed'; fieldId: string; confidence: number })
  | (EventBase & { type: 'run_finished' })
  | (EventBase & { type: 'run_failed'; message: string; stepId?: string });

export interface SourceDocument { id: string; title: string; content: string }
export interface ClaimSnapshot { claim: Claim; run: AgentRun; decisions: ReviewerDecision[]; documents: SourceDocument[] }

export const claimStatuses: ClaimStatus[] = ['running', 'needs_review', 'reviewed', 'failed'];

