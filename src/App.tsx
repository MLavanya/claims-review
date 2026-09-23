import { useCallback, useEffect, useRef, useState } from 'react';
import { decide, eventStream, getClaim, getClaims, replay } from './api/client';
import { createStreamGenerationGuard } from './api/streamGeneration';
import { createStreamLifecycle } from './api/streamLifecycle';
import { applyRunEvent, latestDecisionsByField } from './domain/runReducer';
import type { Claim, ClaimSnapshot, ClaimStatus, DecisionAction, ReplayScenario } from './domain/types';
import { ClaimsQueue } from './features/claims/ClaimsQueue';
import { ClaimReview } from './features/review/ClaimReview';

interface ClaimOverride { status: ClaimStatus; updatedAt: string }

export default function App() {
  const [mobileView, setMobileView] = useState<'queue' | 'review'>('queue');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<ClaimStatus | ''>('');
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const [snapshot, setSnapshot] = useState<ClaimSnapshot>();
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [streamError, setStreamError] = useState('');
  const [busyField, setBusyField] = useState<string>();

  const sourceRef = useRef<EventSource | undefined>(undefined);
  const streamGuardRef = useRef(createStreamGenerationGuard());
  const snapshotsRef = useRef(new Map<string, ClaimSnapshot>());
  const claimOverridesRef = useRef(new Map<string, ClaimOverride>());

  const saveSnapshot = useCallback((next: ClaimSnapshot) => {
    snapshotsRef.current.set(next.claim.id, next);
    setSnapshot(next);
  }, []);

  const updateQueueClaim = useCallback((claimId: string, status: ClaimStatus, updatedAt: string) => {
    claimOverridesRef.current.set(claimId, { status, updatedAt });
    setClaims((current) => current.map((claim) => claim.id === claimId ? { ...claim, status, updatedAt } : claim));
  }, []);

  const loadClaims = useCallback(async () => {
    setQueueLoading(true);
    setQueueError('');
    try {
      const data = await getClaims();
      const merged = data.map((claim) => ({ ...claim, ...claimOverridesRef.current.get(claim.id) }));
      setClaims(merged);
      setSelectedId((current) => current ?? merged[0]?.id);
    } catch {
      setQueueError("We couldn't load the claims.");
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => { void loadClaims(); }, [loadClaims]);

  useEffect(() => {
    if (!selectedId) return;
    let current = true;
    const cleanup = () => {
      current = false;
      streamGuardRef.current.invalidate();
      sourceRef.current?.close();
    };
    const cached = snapshotsRef.current.get(selectedId);
    if (cached) {
      setSnapshot(cached);
      setReviewLoading(false);
      setReviewError('');
      return cleanup;
    }

    setReviewLoading(true);
    setReviewError('');
    getClaim(selectedId)
      .then((data) => { if (current) saveSnapshot(data); })
      .catch(() => { if (current) setReviewError("We couldn't load this claim."); })
      .finally(() => { if (current) setReviewLoading(false); });

    return cleanup;
  }, [saveSnapshot, selectedId]);

  const retryReview = async () => {
    if (!selectedId) return;
    setReviewLoading(true);
    setReviewError('');
    try { saveSnapshot(await getClaim(selectedId)); }
    catch { setReviewError("We couldn't load this claim."); }
    finally { setReviewLoading(false); }
  };

  const connectToRun = (claimId: string, runId: string, scenario: ReplayScenario) => {
    sourceRef.current?.close();
    setStreamError('');
    const session = streamGuardRef.current.begin();
    const lifecycle = createStreamLifecycle();
    let source: EventSource;

    source = eventStream(
      claimId,
      runId,
      scenario,
      (event) => {
        if (!session.isCurrent()) return;
        lifecycle.receive(event);
        const status: ClaimStatus = event.type === 'run_failed' ? 'failed' : event.type === 'run_finished' ? 'needs_review' : 'running';
        updateQueueClaim(claimId, status, event.timestamp);
        setSnapshot((current) => {
          if (!current || current.claim.id !== claimId) return current;
          const next = {
            ...current,
            run: applyRunEvent(current.run, event),
            claim: { ...current.claim, status, updatedAt: event.timestamp },
          };
          snapshotsRef.current.set(claimId, next);
          return next;
        });
        if (event.type === 'run_finished' || event.type === 'run_failed') source.close();
      },
      () => {
        if (session.isCurrent() && lifecycle.shouldReportInterruption()) {
          setStreamError('The live connection was interrupted. Existing results are preserved; replay to restart.');
        }
      },
    );
    sourceRef.current = source;
  };

  const handleReplay = async (scenario: ReplayScenario) => {
    if (!selectedId) return;
    setReviewError('');
    streamGuardRef.current.invalidate();
    sourceRef.current?.close();
    const data = await replay(selectedId, scenario);
    saveSnapshot(data);
    updateQueueClaim(selectedId, 'running', data.claim.updatedAt);
    connectToRun(selectedId, data.run.runId, scenario);
  };

  const handleDecision = async (fieldId: string, action: DecisionAction, value?: string) => {
    if (!selectedId || !snapshot) return;
    const submitted = snapshotsRef.current.get(selectedId) ?? snapshot;
    const field = submitted.run.fields[fieldId];
    if (!field) return;
    setBusyField(fieldId);
    try {
      const result = await decide(selectedId, fieldId, action, value, field, submitted.run, submitted.decisions);
      const current = snapshotsRef.current.get(selectedId) ?? submitted;
      const decisions = [...current.decisions, result.decision];
      const latest = latestDecisionsByField(decisions);
      const allCurrentFieldsDecided = Object.values(current.run.fields).every((item) => latest[item.id]?.reviewedAgentVersion === item.version);
      const status: ClaimStatus = current.run.status === 'running' ? 'running'
        : current.run.status === 'failed' ? 'failed'
          : current.run.status === 'finished' && allCurrentFieldsDecided ? 'reviewed' : 'needs_review';
      const next = {
        ...current,
        claim: { ...result.claim, status },
        decisions,
      };
      saveSnapshot(next);
      updateQueueClaim(selectedId, status, result.claim.updatedAt);
    } finally {
      setBusyField(undefined);
    }
  };

  const selectClaim = (claimId: string) => {
    setSelectedId(claimId);
    setMobileView('review');
  };

  const visibleClaims = filter ? claims.filter((claim) => claim.status === filter) : claims;

  return <>
    <header className="topbar">
      <div className="brand-mark">MX</div>
      <div><strong>MarvelX</strong><span>Claims review</span></div>
    </header>
    <div className={`app-shell mobile-${mobileView}`}>
      <ClaimsQueue claims={visibleClaims} selectedId={selectedId} filter={filter} loading={queueLoading} error={queueError} onFilter={setFilter} onSelect={selectClaim} onRetry={() => void loadClaims()} />
      {reviewLoading && <main className="review"><p className="state-message" role="status">Loading claim review…</p></main>}
      {!reviewLoading && reviewError && <main className="review"><div className="error" role="alert"><p>{reviewError}</p><button onClick={() => void retryReview()}>Try again</button></div></main>}
      {!reviewLoading && !reviewError && snapshot && <ClaimReview key={snapshot.claim.id} snapshot={snapshot} streamError={streamError} busyField={busyField} onBack={() => setMobileView('queue')} onReplay={handleReplay} onDecision={handleDecision} />}
      {!reviewLoading && !snapshot && !reviewError && <main className="review"><p className="state-message">Select a claim to begin.</p></main>}
    </div>
  </>;
}
