import type { ClaimStatus } from '../../domain/types';

export function StatusFilter({ value, onChange }: { value: ClaimStatus | ''; onChange: (value: ClaimStatus | '') => void }) {
  return <label className="filter">Status <select value={value} onChange={(event) => onChange(event.target.value as ClaimStatus | '')}><option value="">All claims</option><option value="running">Running</option><option value="needs_review">Needs review</option><option value="reviewed">Reviewed</option><option value="failed">Failed</option></select></label>;
}

