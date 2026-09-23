import type { Claim, ClaimStatus } from '../../domain/types';
import { StatusFilter } from './StatusFilter';

const labels: Record<ClaimStatus, string> = { running: 'Agent running', needs_review: 'Needs review', reviewed: 'Reviewed', failed: 'Run failed' };
export const statusLabel = (status: ClaimStatus) => labels[status];

interface Props { claims: Claim[]; selectedId?: string; filter: ClaimStatus | ''; loading: boolean; error?: string; onFilter: (status: ClaimStatus | '') => void; onSelect: (id: string) => void; onRetry: () => void }
export function ClaimsQueue({ claims, selectedId, filter, loading, error, onFilter, onSelect, onRetry }: Props) {
  return <aside className="queue" aria-labelledby="queue-title"><div className="queue-heading"><div><p className="eyebrow">Workspace</p><h2 id="queue-title">Claims queue</h2></div><span className="count">{claims.length}</span></div><StatusFilter value={filter} onChange={onFilter} />
    {loading && <p className="state-message" role="status">Loading claims…</p>}
    {error && <div className="error" role="alert"><p>{error}</p><button onClick={onRetry}>Try again</button></div>}
    {!loading && !error && claims.length === 0 && <p className="state-message">{filter ? `No ${statusLabel(filter).toLowerCase()} claims.` : 'No claims available.'}</p>}
    <ul className="claim-list">{claims.map((claim) => <li key={claim.id}><button className={`claim-row ${selectedId === claim.id ? 'selected' : ''}`} aria-current={selectedId === claim.id ? 'true' : undefined} onClick={() => onSelect(claim.id)}><span className="claim-row-top"><strong>{claim.claimId}</strong><span className={`badge ${claim.status}`}>{statusLabel(claim.status)}</span></span><span>{claim.claimantName}</span><span className="meta"><span className={`priority ${claim.priority}`}>{claim.priority} priority</span><time dateTime={claim.updatedAt}>{new Date(claim.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time></span></button></li>)}</ul>
  </aside>;
}

