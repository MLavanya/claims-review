import type { SourceCitation, SourceDocument } from '../domain/types.js';

export const documents: SourceDocument[] = [
  { id: 'police-report', title: 'Incident report', content: 'The claimant stated that the incident occurred on 10 September 2026 after a pipe burst beneath the kitchen sink. Water damaged the fitted cabinets and flooring.' },
  { id: 'invoice', title: 'Repair estimate', content: 'Northbank Repairs inspected the kitchen. The revised estimate totals €4,520 including materials, cabinet replacement and labour.' },
  { id: 'policy', title: 'Home policy', content: 'Policy HX-2048 covers sudden escape of water and resulting damage. The policy excess is €350.' },
];

export function citation(documentId: string, evidence: string): SourceCitation {
  const document = documents.find((item) => item.id === documentId);
  if (!document) throw new Error(`Unknown source document: ${documentId}`);
  const start = document.content.indexOf(evidence);
  if (start < 0) throw new Error(`Evidence not found in ${documentId}: ${evidence}`);
  return { documentId, start, end: start + evidence.length };
}
