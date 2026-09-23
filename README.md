# Agent-Assisted Claims Review

A small MarvelX Product Engineer take-home for a human claims reviewer. A simulated agent reads fictional claim documents over time, drafts a summary, extracts cited fields, revises its output, and may fail part-way. The reviewer can accept, correct, or override a field without waiting for the run to finish.

This is an exercise, not production claims software. It has no real AI, database, authentication, or insurer integration.

## Run locally

Requires a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite runs the frontend and proxies `/api` to the local Express server on port 3001.

Useful checks:

```bash
npm test
npm run typecheck
npm run build
```

## Replay the agent

Select `CLM-1042`, then use the controls at the top of the review:

- **Replay normal run** streams steps, several summary pieces, three extracted fields, a visible confidence change, a field revision, and successful completion.
- **Replay failed run** stops during the policy check but preserves the summary, completed steps, and two fields already produced.

Replay resets only the selected claim's simulated run and reviewer decisions. This is stated beside the controls so the reset is not surprising. During the normal replay, act on **Estimated damage** when it first appears as €4,250. The later revision to €4,520 will preserve and flag that earlier human decision.

## State and data contract

[`src/domain/types.ts`](src/domain/types.ts) defines `Claim`, `AgentRun`, `ExtractedField`, `SourceCitation`, `ReviewerDecision`, and the discriminated `RunEvent` union. A claim is the queue record; its run contains only agent-produced progress, summary, fields, and lifecycle state.

[`src/domain/runReducer.ts`](src/domain/runReducer.ts) applies agent events exhaustively. It does not own reviewer decisions. Fields retain a current model value, source, confidence, monotonically increasing version, and lightweight revision/confidence history. Citations are `{ documentId, start, end }`; fixture offsets are derived from known evidence text in [`src/fixtures/documents.ts`](src/fixtures/documents.ts), which throws if that evidence is absent.

Reviewer decisions are an append-only in-memory array in [`server/store.ts`](server/store.ts). Each records the server timestamp and `reviewedAgentVersion`. The UI combines the latest field and latest decision only for presentation. When `field.version > decision.reviewedAgentVersion`, it shows that the agent changed the field after the human acted; neither source is overwritten.

Claim-status semantics are an exercise assumption: a live run remains `running`. After `run_finished`, it becomes `reviewed` only if every latest field version has a current decision; otherwise it becomes `needs_review`. A stale decision requires renewed review. `run_failed` always remains `failed`, while partial findings remain visible.

The browser hydrates a server snapshot, then applies later SSE events. The server applies those same events to its authoritative in-memory state. Event sequence IDs provide only a minimal duplicate safeguard, not durable replay or event sourcing.

## Design decisions

1. **Progress has meaning.** Named steps and their text status replace an ambiguous spinner, so a reviewer can see what finished and where a failure occurred.
2. **Evidence sits beside each field.** Confidence is secondary and explicitly described as model confidence, not truth. An expandable source excerpt highlights the exact cited span.
3. **Agent and reviewer provenance stay visible.** Current AI output, AI revisions, confidence movement, and human decisions have distinct labels. A post-decision revision gets an explicit “Needs another look” warning.

Before trusting the screen, I would watch a real reviewer respond when the agent changes a field after they already accepted, corrected, or overrode it. The warning and renewed-review rule are product assumptions, not validated research.

## What the agent did and what I did

Codex generated the initial plan and implementation under the supplied project rules. The candidate reviewed and approved the stack and architecture, then directed the following real rework:

- The plan needed a sharper state boundary. Reviewer decisions remain backend-persisted state; the run reducer now processes agent events only. Field versions and `reviewedAgentVersion` provide the simple collision test.
- Manual testing found that intentional SSE completion was incorrectly shown as a transport interruption. Terminal-event handling was corrected so successful and simulated-failure closes do not show a contradictory connection error.
- Manual testing found that the initial responsive CSS was inadequate at phone width. The queue, detail cards, evidence, and controls were reworked to stack and wrap without page-level horizontal overflow.

The React/Vite frontend, Express/SSE backend, plain CSS, and focused Vitest/Supertest approach were accepted as-is. They were appropriate to the timebox, avoided unjustified infrastructure, and were checked with strict TypeScript, automated tests, a production build, and live API exercises.

[`prompts/`](prompts/) contains the initial implementation prompt and plan-review prompt that were preserved during development. Later iterations were driven by manual testing and follow-up instructions, which were not all preserved as standalone prompt files. I have not recreated those prompts after the fact. The final plan is in [`docs/implementation-plan.md`](docs/implementation-plan.md), and factual working notes are in [`docs/ai-development-notes.md`](docs/ai-development-notes.md). No Claude configuration, custom skills, or invented interaction history was added.

## The next ticket

Future requirement: “A reviewer can accept every field above a chosen confidence threshold across all claims in their queue, in one action.” This is deliberately not implemented.

It would extend the server store with one validated bulk operation and add an API route; it should reuse stable field IDs, field versions, explicit decisions, and the existing reviewed-status calculation. A focused UI control could submit the threshold, but browser state must not decide which fields are accepted.

The likely mistake for an engineer using an AI agent is to iterate over visible frontend fields and write `effectiveValue = reviewerValue || agentValue`. That can accept stale versions, overwrite corrections/overrides, treat confidence as proof, and mishandle a revision during processing. The endpoint would need server-side selection, an expected field version, idempotency, existing-decision protection, and a per-claim result for partial success. Current separate state, stable identifiers, versioned decisions, append-only history, and collision tests reduce those risks without pre-building the feature.

## Something we did not ask for

The implementation stores the exact agent field version reviewed by the human. The brief required preserving decisions after a revision, but not this mechanism. It makes the warning deterministic and protects provenance without comparing unreliable timestamps or silently attaching an old acceptance to a new model value.

## Pushback

I would clarify the business semantics of **correct** versus **override** with product and claims experts. That distinction affects language, audit history, analytics, and future automation. For this exercise, **correct** means the agent identified the right field but extracted the wrong value; **override** means the reviewer rejects the agent's conclusion and supplies a human conclusion.

## What next, and what you left out

A production version needs durable storage and audit retention, authentication and authorization, idempotent/concurrency-safe writes, real agent integration, stream reconnection and resume semantics, stronger schema validation, observability, data protection controls, broader end-to-end testing, and usability/accessibility testing with real claims reviewers.

Deliberately omitted for this timeboxed exercise: a database, authentication, real AI calls, PDF rendering, production event infrastructure, WebSockets, global state management, a design system, deployment setup, and exhaustive tests. In-memory state disappears when the server restarts.

## Time spent

I spent roughly 4 hours on the exercise.

I first spent some time understanding the requirements and deciding how I wanted the reviewer and AI agent interaction to work. One thing I wanted to handle properly was what happens when the reviewer already makes a decision and the AI changes its answer later.

Most of the time went into building the actual flow - the claims queue, live agent updates, extracted fields, confidence and evidence, and the Accept, Correct and Override actions.

I also spent time testing the normal and failed runs, checking the mobile layout, and fixing issues I found while testing.

I kept the backend and agent simulation simple on purpose. For this exercise I felt it was more important to show the complete reviewer flow than to add things like a real database, authentication or a real AI integration.

## API summary

- `GET /api/claims?status=running` — queue with validated optional status filter.
- `GET /api/claims/:claimId` — claim, run, documents, and decisions for hydration.
- `GET /api/claims/:claimId/events` — timed server-sent run events.
- `POST /api/claims/:claimId/decisions` — validated accept/correct/override.
- `POST /api/claims/:claimId/replay` — reset and run `normal` or `failed` fixture.
