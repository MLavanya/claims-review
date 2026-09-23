import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { decide, eventStream, getClaim, getClaims, replay } from './api/client';
import { createStreamGenerationGuard } from './api/streamGeneration';
import { createStreamLifecycle } from './api/streamLifecycle';
import { applyRunEvent } from './domain/runReducer';
import type { Claim, ClaimSnapshot, ClaimStatus, DecisionAction, ReplayScenario } from './domain/types';
import { ClaimsQueue } from './features/claims/ClaimsQueue';
import { ClaimReview } from './features/review/ClaimReview';

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
  const [, forceRunRender] = useReducer((value) => value + 1, 0);

  const sourceRef = useRef<EventSource | undefined>(undefined);
  const streamGuardRef = useRef(createStreamGenerationGuard());

  const loadClaims = useCallback(async () => {
    setQueueLoading(true);
    setQueueError('');

    try {
      const data = await getClaims(filter);
      setClaims(data);
      if (!selectedId && data[0]) setSelectedId(data[0].id);
    } catch {
      setQueueError("We couldn't load the claims.");
    } finally {
      setQueueLoading(false);
    }
  }, [filter, selectedId]);

  useEffect(() => {
    void loadClaims();
  }, [filter]); // Selecting a claim should not refetch the queue.

  useEffect(() => {
    if (!selectedId) return;

    let current = true;
    setReviewLoading(true);
    setReviewError('');

    getClaim(selectedId)
      .then((data) => { if (current) setSnapshot(data); })
      .catch(() => { if (current) setReviewError("We couldn't load this claim."); })
      .finally(() => { if (current) setReviewLoading(false); });

    return () => {
      current = false;
      streamGuardRef.current.invalidate();
      sourceRef.current?.close();
    };
  }, [selectedId]);

  const retryReview = async () => {
    if (!selectedId) return;

    setReviewLoading(true);
    setReviewError('');
    try {
      setSnapshot(await getClaim(selectedId));
    } catch {
      setReviewError("We couldn't load this claim.");
    } finally {
      setReviewLoading(false);
    }
  };

  const connectToRun = (claimId: string) => {
    sourceRef.current?.close();
    setStreamError('');

    const session = streamGuardRef.current.begin();
    const lifecycle = createStreamLifecycle();
    let source: EventSource;

    source = eventStream(
      claimId,
      (event) => {
        if (!session.isCurrent()) return;

        const terminal = event.type === 'run_finished' || event.type === 'run_failed';
        lifecycle.receive(event);
        setSnapshot((current) => current ? {
          ...current,
          run: applyRunEvent(current.run, event),
          claim: {
            ...current.claim,
            status: event.type === 'run_failed' ? 'failed' : event.type === 'run_finished' ? 'needs_review' : 'running',
            updatedAt: event.timestamp,
          },
        } : current);

        if (terminal) {
          source.close();
          void loadClaims();
          void getClaim(claimId).then((latest) => {
            if (session.isCurrent()) setSnapshot(latest);
          });
        }

        forceRunRender();
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
    setSnapshot(data);
    connectToRun(selectedId);
    await loadClaims();
  };

  const handleDecision = async (fieldId: string, action: DecisionAction, value?: string) => {
    if (!selectedId) return;

    setBusyField(fieldId);
    try {
      const result = await decide(selectedId, fieldId, action, value);
      setSnapshot((current) => current ? {
        ...current,
        claim: result.claim,
        decisions: [...current.decisions, result.decision],
      } : current);
      await loadClaims();
    } finally {
      setBusyField(undefined);
    }
  };

  const selectClaim = (claimId: string) => {
    setSelectedId(claimId);
    setMobileView('review');
  };

  return <>
    <header className="topbar">
      <div className="brand-mark">MX</div>
      <div><strong>MarvelX</strong><span>Claims review</span></div>
    </header>
    <div className={`app-shell mobile-${mobileView}`}>
      <ClaimsQueue
        claims={claims}
        selectedId={selectedId}
        filter={filter}
        loading={queueLoading}
        error={queueError}
        onFilter={setFilter}
        onSelect={selectClaim}
        onRetry={() => void loadClaims()}
      />
      {reviewLoading && <main className="review"><p className="state-message" role="status">Loading claim review…</p></main>}
      {!reviewLoading && reviewError && <main className="review"><div className="error" role="alert"><p>{reviewError}</p><button onClick={() => void retryReview()}>Try again</button></div></main>}
      {!reviewLoading && !reviewError && snapshot && <ClaimReview key={snapshot.claim.id} snapshot={snapshot} streamError={streamError} busyField={busyField} onBack={() => setMobileView('queue')} onReplay={handleReplay} onDecision={handleDecision} />}
      {!reviewLoading && !snapshot && !reviewError && <main className="review"><p className="state-message">Select a claim to begin.</p></main>}
    </div>
  </>;
}
