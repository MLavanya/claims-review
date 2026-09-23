import type { DecisionAction, ExtractedField, ReviewerDecision, SourceDocument } from '../../domain/types';
import { Evidence } from './Evidence';
import { DecisionControls } from './DecisionControls';

const percent = (value: number) => `${Math.round(value * 100)}%`;
export function ExtractedFieldCard({ field, decision, documents, busy, onDecision }: { field: ExtractedField; decision?: ReviewerDecision; documents: SourceDocument[]; busy: boolean; onDecision: (action: DecisionAction, value?: string) => Promise<void> }) {
  const stale = Boolean(decision && field.version > decision.reviewedAgentVersion);
  const decisionText = decision?.action === 'accept' ? `Accepted ${decision.value}` : decision?.action === 'correct' ? `Corrected to ${decision.value}` : decision ? `Overridden to ${decision.value}` : '';
  return <article className={`field-card ${stale ? 'stale' : ''} ${decision ? 'decided' : ''}`}><header><div><p className="provenance">AI extracted</p><h3>{field.label}</h3></div><span className="confidence" title="Model confidence is not proof of correctness">{percent(field.confidence)} confidence</span></header><p className="agent-value">{field.value}</p>
    {field.revisions.length > 0 && <p className="change-note"><strong>AI updated this field:</strong> {field.revisions.at(-1)?.value} → {field.value}</p>}
    {field.confidenceChanges.map((change) => <p className="change-note" key={change.changedAt}><strong>Confidence changed:</strong> {percent(change.from)} → {percent(change.to)}</p>)}
    <Evidence source={field.source} documents={documents} />
    {decision && <div className="human-decision"><p className="provenance">Reviewer decision</p><p><strong>{decisionText}</strong></p><small>{stale ? 'This decision was made before the AI updated this field' : `Saved ${new Date(decision.decidedAt).toLocaleTimeString()}`}</small></div>}
    {stale && <p className="stale-warning" role="status"><strong>Needs another look.</strong> The AI changed this after your decision.</p>}
    <DecisionControls field={field} hasDecision={Boolean(decision)} busy={busy} onSubmit={onDecision} />
  </article>;
}
