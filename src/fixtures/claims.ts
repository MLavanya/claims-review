import type { Claim } from '../domain/types.js';

export const initialClaims: Claim[] = [
  { id: 'c-1042', claimId: 'CLM-1042', claimantName: 'Maya de Vries', status: 'needs_review', priority: 'high', updatedAt: '2026-09-23T08:30:00.000Z' },
  { id: 'c-1038', claimId: 'CLM-1038', claimantName: 'Jonas Smit', status: 'reviewed', priority: 'medium', updatedAt: '2026-09-22T14:15:00.000Z' },
  { id: 'c-1031', claimId: 'CLM-1031', claimantName: 'Amira El Idrissi', status: 'failed', priority: 'low', updatedAt: '2026-09-22T10:05:00.000Z' },
];
