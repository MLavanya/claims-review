import type { AgentStep } from '../../domain/types';
const icon = { pending: '○', running: '●', completed: '✓', failed: '×' };
export function AgentProgress({ steps }: { steps: AgentStep[] }) {
  return <section className="panel" aria-labelledby="progress-title"><div className="section-heading"><div><p className="eyebrow">Live activity</p><h2 id="progress-title">Agent progress</h2></div></div>{steps.length === 0 ? <p className="muted">Start a replay to watch the review unfold.</p> : <ol className="steps">{steps.map((step) => <li key={step.id} className={step.status}><span aria-hidden="true">{icon[step.status]}</span><span>{step.label}</span><small>{step.status}</small></li>)}</ol>}</section>;
}

