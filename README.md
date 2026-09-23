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

## Deploy to Vercel

`vercel.json` sends every `/api/...` path to one Vercel Function that runs the existing Express app. The same file keeps non-API page refreshes on the Vite application and gives the SSE fixture enough time to finish streaming.

The deployed demo does not rely on mutable server memory. Replay creates a run ID, the SSE request deterministically streams that run, and reviewer actions are validated and stamped by the backend using the current run/field context. The browser session keeps the active snapshots that drive both queue and review. Refreshing the page resets the demo to its deterministic fixtures; durable cross-session state would require shared storage and is deliberately outside this take-home.

## Replay the agent

Select `CLM-1042`, then use the controls at the top of the review:

- **Replay normal run** streams steps, several summary pieces, three extracted fields, a visible confidence change, a field revision, and successful completion.
- **Replay failed run** stops during the policy check but preserves the summary, completed steps, and two fields already produced.

Replay resets only the selected claim's simulated run and reviewer decisions. This is stated beside the controls so the reset is not surprising. During the normal replay, act on **Estimated damage** when it first appears as €4,250. The later revision to €4,520 will preserve and flag that earlier human decision.

## State and data contract

[`src/domain/types.ts`](src/domain/types.ts) defines `Claim`, `AgentRun`, `ExtractedField`, `SourceCitation`, `ReviewerDecision`, and the discriminated `RunEvent` union. A claim is the queue record; its run contains only agent-produced progress, summary, fields, and lifecycle state.

[`src/domain/runReducer.ts`](src/domain/runReducer.ts) applies agent events exhaustively. It does not own reviewer decisions. Fields retain a current model value, source, confidence, monotonically increasing version, and lightweight revision/confidence history. Citations are `{ documentId, start, end }`; fixture offsets are derived from known evidence text in [`src/fixtures/documents.ts`](src/fixtures/documents.ts), which throws if that evidence is absent.

Reviewer decisions remain separate from agent output and append-only within the browser demo session. Each decision is submitted to the backend for validation and receives a server-generated ID, timestamp, and `reviewedAgentVersion`. When `field.version > decision.reviewedAgentVersion`, the UI shows that the agent changed the field after the human acted; neither source is overwritten.

Claim-status semantics are an exercise assumption: a live run remains `running`. After `run_finished`, it becomes `reviewed` only if every latest field version has a current decision; otherwise it becomes `needs_review`. A stale decision requires renewed review. `run_failed` always remains `failed`, while partial findings remain visible.

The browser hydrates deterministic fixture snapshots and then owns one coherent active-session snapshot per claim. Both queue and detail derive from that same snapshot. Each SSE request generates its named run independently, so replay, streaming, and decisions do not depend on separate Vercel requests reaching the same function instance. Event sequence IDs and run IDs reject stale or duplicate updates; this remains a demo, not durable event sourcing.

## Design decisions

1. **Progress has meaning.** Named steps and their text status replace an ambiguous spinner, so a reviewer can see what finished and where a failure occurred.
2. **Evidence sits beside each field.** Confidence is secondary and explicitly described as model confidence, not truth. An expandable source excerpt highlights the exact cited span.
3. **Agent and reviewer provenance stay visible.** Current AI output, AI revisions, confidence movement, and human decisions have distinct labels. A post-decision revision gets an explicit “Needs another look” warning.

Before trusting the screen, I would watch a real reviewer respond when the agent changes a field after they already accepted, corrected, or overrode it. The warning and renewed-review rule are product assumptions, not validated research.

## What the agent did and what I did

Codex generated the initial plan and implementation under the supplied project rules. The candidate reviewed and approved the stack and architecture, then directed the following real rework:

- The plan needed a sharper state boundary. The run reducer processes agent events only, while reviewer decisions stay separate and carry `reviewedAgentVersion` for collision detection. For Vercel, the later deployment pass made this state browser-session scoped and backend-validated so it does not depend on one permanent server process.
- Manual testing found that intentional SSE completion was incorrectly shown as a transport interruption. Terminal-event handling was corrected so successful and simulated-failure closes do not show a contradictory connection error.
- Manual testing found that the initial responsive CSS was inadequate at phone width. The queue, detail cards, evidence, and controls were reworked to stack and wrap without page-level horizontal overflow.

The React/Vite frontend, Express/SSE backend, plain CSS, and focused Vitest/Supertest approach were accepted as-is. They were appropriate to the timebox, avoided unjustified infrastructure, and were checked with strict TypeScript, automated tests, a production build, and live API exercises.

[`prompts/`](prompts/) contains the initial implementation prompt and plan-review prompt that were preserved during development. Later iterations were driven by manual testing and follow-up instructions, which were not all preserved as standalone prompt files. I have not recreated those prompts after the fact. The final plan is in [`docs/implementation-plan.md`](docs/implementation-plan.md), and factual working notes are in [`docs/ai-development-notes.md`](docs/ai-development-notes.md). No Claude configuration, custom skills, or invented interaction history was added.

## The next ticket

Future requirement: “A reviewer can accept every field above a chosen confidence threshold across all claims in their queue, in one action.” This is deliberately not implemented.

It would add one validated bulk API operation backed by durable shared storage; it should reuse stable field IDs, field versions, explicit decisions, and the existing reviewed-status calculation. A focused UI control could submit the threshold, but browser state must not decide which fields are accepted in production.

The likely mistake for an engineer using an AI agent is to iterate over visible frontend fields and write `effectiveValue = reviewerValue || agentValue`. That can accept stale versions, overwrite corrections/overrides, treat confidence as proof, and mishandle a revision during processing. The endpoint would need server-side selection, an expected field version, idempotency, existing-decision protection, and a per-claim result for partial success. Current separate state, stable identifiers, versioned decisions, append-only history, and collision tests reduce those risks without pre-building the feature.

## Something we did not ask for

The implementation stores the exact agent field version reviewed by the human. The brief required preserving decisions after a revision, but not this mechanism. It makes the warning deterministic and protects provenance without comparing unreliable timestamps or silently attaching an old acceptance to a new model value.

## Pushback

I would clarify the business semantics of **correct** versus **override** with product and claims experts. That distinction affects language, audit history, analytics, and future automation. For this exercise, **correct** means the agent identified the right field but extracted the wrong value; **override** means the reviewer rejects the agent's conclusion and supplies a human conclusion.

## What next, and what you left out

A useful next product pass would make a larger queue easier to work with. I would add more filters, such as priority and confidence, and place claim search beside the existing status filter. I would also require a short reason when a reviewer corrects or overrides an agent value. That reason would make manual changes clearer to another reviewer and more useful in the audit history.

A production version also needs durable storage and audit retention, authentication and authorization, idempotent/concurrency-safe writes, real agent integration, stream reconnection and resume semantics, stronger schema validation, observability, data protection controls, broader end-to-end testing, and usability/accessibility testing with real claims reviewers.

Deliberately omitted for this timeboxed exercise: additional queue filters, claim search, mandatory reasons for manual decisions, a database, authentication, real AI calls, PDF rendering, production event infrastructure, WebSockets, global state management, a design system, and exhaustive tests. Active demo state resets to fixtures on a browser refresh.

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
