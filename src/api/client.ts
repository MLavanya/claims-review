import type { Claim, ClaimSnapshot, DecisionAction, ReplayScenario, ReviewerDecision, RunEvent } from '../domain/types';

async function json<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? 'The request failed.');
  return body;
}

export async function getClaims(status?: string): Promise<Claim[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return (await json<{ claims: Claim[] }>(await fetch(`/api/claims${query}`))).claims;
}
export const getClaim = async (id: string) => json<ClaimSnapshot>(await fetch(`/api/claims/${id}`));
export const replay = async (id: string, scenario: ReplayScenario) => json<ClaimSnapshot>(await fetch(`/api/claims/${id}/replay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario }) }));
export const decide = async (id: string, fieldId: string, action: DecisionAction, value?: string) => json<{ decision: ReviewerDecision; claim: Claim }>(await fetch(`/api/claims/${id}/decisions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fieldId, action, value }) }));
export function eventStream(id: string, onEvent: (event: RunEvent) => void, onError: () => void): EventSource {
  const source = new EventSource(`/api/claims/${id}/events`);
  source.onmessage = (message) => onEvent(JSON.parse(message.data) as RunEvent);
  source.onerror = () => { if (source.readyState !== EventSource.CLOSED) onError(); };
  return source;
}

