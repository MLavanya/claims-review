import { useState } from 'react';
import type { ClaimSnapshot, DecisionAction, ReplayScenario } from '../../domain/types';
import { latestDecisionsByField } from '../../domain/runReducer';
import { statusLabel } from '../claims/ClaimsQueue';
import { AgentProgress } from './AgentProgress';
import { ExtractedFieldCard } from './ExtractedFieldCard';

interface Props { snapshot: ClaimSnapshot; streamError?: string; busyField?: string; onBack?: () => void; onReplay: (scenario: ReplayScenario) => Promise<void>; onDecision: (fieldId: string, action: DecisionAction, value?: string) => Promise<void> }

export function ClaimReview({ snapshot, streamError, busyField, onBack, onReplay, onDecision }: Props) {
  const { claim, run, decisions, documents } = snapshot;
  const [pendingReplay, setPendingReplay] = useState<ReplayScenario>();
  const latest = latestDecisionsByField(decisions);
  const fields = Object.values(run.fields);

  const confirmReplay = () => {
    if (!pendingReplay) return;
    const scenario = pendingReplay;
    setPendingReplay(undefined);
    void onReplay(scenario);
  };

  return <main className="review" id="claim-review">
    <button className="mobile-back secondary" onClick={onBack}>← Back to claims</button>
    <header className="review-header"><div><p className="eyebrow">{claim.claimId}</p><h1>{claim.claimantName}</h1><p className="muted">Human review remains final. Check the source before deciding.</p></div><span className={`badge large ${claim.status}`}>{statusLabel(claim.status)}</span></header>
    <section className="replay-bar" aria-labelledby="replay-title">
      <div><h2 id="replay-title">Run demonstration</h2><p>Replaying clears this claim’s simulated run and reviewer decisions.</p></div>
      {pendingReplay ? <div className="replay-confirm" role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-description">
        <strong id="confirm-title">Replay {pendingReplay} run?</strong>
        <p id="confirm-description">This will clear this claim’s simulated run and reviewer decisions.</p>
        <div className="actions"><button className="secondary" autoFocus onClick={() => setPendingReplay(undefined)}>Cancel</button><button className="primary" onClick={confirmReplay}>Replay</button></div>
      </div> : <div className="actions"><button className="secondary" onClick={() => setPendingReplay('normal')}>Replay normal run</button><button className="secondary" onClick={() => setPendingReplay('failed')}>Replay failed run</button></div>}
    </section>
    {streamError && <p className="error" role="alert">{streamError}</p>}
    {run.failure && <div className="failure" role="alert"><strong>Agent run stopped</strong><p>{run.failure.message}</p><p>Useful findings produced before the failure are preserved below.</p></div>}
    {run.status === 'finished' && <p className="success" role="status">The agent finished. Review each field against its evidence.</p>}
    <div className="review-grid"><AgentProgress steps={run.steps} /><section className="panel summary-panel" aria-labelledby="summary-title"><p className="eyebrow">Drafted by the agent</p><h2 id="summary-title">Claim summary</h2><p className={run.summary ? 'summary' : 'muted'}>{run.summary || 'The summary will form here as the agent reads.'}{run.status === 'running' && <span className="cursor" aria-hidden="true" />}</p></section></div>
    <section aria-labelledby="fields-title"><div className="section-heading"><div><p className="eyebrow">Verify against source</p><h2 id="fields-title">Extracted fields</h2></div><span className="count">{fields.length}</span></div>{fields.length === 0 ? <div className="panel state-message">No fields extracted yet.</div> : <div className="field-list">{fields.map((field) => <ExtractedFieldCard key={field.id} field={field} decision={latest[field.id]} documents={documents} busy={busyField === field.id} onDecision={(action, value) => onDecision(field.id, action, value)} />)}</div>}</section>
    <p className="sr-only" aria-live="polite">{run.status === 'running' ? 'Agent run in progress.' : run.status === 'finished' ? 'Agent run finished.' : run.status === 'failed' ? 'Agent run failed.' : ''}</p>
  </main>;
}
