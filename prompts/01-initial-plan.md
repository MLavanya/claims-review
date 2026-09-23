I am building a real hiring take-home assignment for MarvelX AI for the role:

Product Engineer (Frontend-leaning)

The assignment is called:

"Agent-Assisted Claims Review"

This is a real hiring exercise, not a demo project.

I will have to walk through this repository with the Engineering Lead afterwards and defend the product decisions, architecture, state model, backend behaviour, testing choices, accessibility choices, AI usage and trade-offs.

The official timebox is around 4 hours.

Your job is to help me build the smallest complete, thoughtful and maintainable solution that satisfies EVERY requirement below without unnecessary complexity.

IMPORTANT WORKING PRINCIPLES

- Treat this as code another engineering team will inherit and continue building.
- Keep the implementation proportional to a four-hour take-home.
- Prefer simple, explicit and readable code over clever abstractions.
- Do not add technology simply to look impressive.
- I must be able to understand and explain everything you create.
- Do not silently make important product decisions.
- When the brief is ambiguous, choose the simplest reasonable behaviour and document the assumption.
- Do not fabricate production experience, user research, AI interactions, test results or decisions.
- Do not claim something was implemented unless it actually exists.
- Do not add requirements that are not in the brief unless there is a clear product/engineering reason.
- Do not remove or weaken any requirement below.
- Before changing existing code, inspect it.
- Do not rewrite unrelated working code.
- Use strict TypeScript for important domain logic.
- Avoid `any` in the core domain/event model.
- Keep AI/model output separate from human reviewer decisions.
- Never silently overwrite a human reviewer decision when the agent later revises its output.
- Preserve provenance: we must always know whether something came from the agent or the reviewer.
- Backend/server state is authoritative for persisted reviewer decisions and claim/run status.
- Accessibility, error handling and responsive behaviour are required, not optional.
- Tests should protect risky domain behaviour rather than maximize coverage.
- Do not build a real AI integration.
- Do not build a production database.
- Do not build authentication.
- Do not overengineer this exercise.

============================================================
0. AI / CODEX WORKFLOW — IMPORTANT FOR THE SUBMISSION
============================================================

MarvelX explicitly requires candidates to commit the agent configuration they actually used.

Their requirement is:

"Commit what you used, in the state you last used it: CLAUDE.md, AGENTS.md, rules files, skills, prompts, plans. If you did not use an agent, say so in the README and skip this section. Do not invent one."

I AM using Codex.

Therefore the repository must honestly preserve the Codex workflow actually used.

Do NOT manufacture AI configuration merely because MarvelX listed examples.

Specifically:

- We should use a real AGENTS.md for this project.
- Preserve this initial prompt in the repository, for example:
  prompts/01-initial-plan.md
- Preserve later substantial prompts only if they are actually used.
- Preserve the implementation plan we actually agree on.
- Maintain short development/AI notes so the README can truthfully describe where AI output was accepted or rejected/reworked.
- Do NOT create CLAUDE.md unless Claude is genuinely used.
- Do NOT create fake skills.
- Do NOT create fake rule files.
- Do NOT create fake prompts after development.
- Do NOT manufacture an AI interaction history.
- If a Codex skill becomes genuinely useful and is actually used, preserve it. Otherwise there is no requirement to create one.
- If additional rules/configuration are genuinely used, commit them in their final used state.

Create/use an AGENTS.md containing the durable working rules for this project, including at minimum:

# Agent-Assisted Claims Review

## Goal

Build the MarvelX Product Engineer take-home as a small, maintainable React + TypeScript application.

The assignment is timeboxed to around four hours.

Prefer simple, understandable solutions over unnecessary architecture.

## Core product rules

1. Agent output and reviewer decisions are separate data.
2. Never silently overwrite a reviewer decision when the agent later revises a field.
3. Preserve provenance: the UI must make clear whether a change came from the agent or the reviewer.
4. Backend/server state is authoritative for persisted reviewer decisions.
5. Partial agent failure must preserve useful results already produced.
6. Evidence/citations should be more important than confidence alone.
7. Reviewer actions must work while the agent is still running.
8. Agent revisions must remain visible.
9. Do not treat model output as guaranteed truth.

## Engineering rules

- React + TypeScript.
- Strict TypeScript for domain logic.
- Avoid `any` in core domain code.
- Prefer a discriminated union for run events.
- Keep components reasonably small.
- Prefer feature-local state/useReducer unless global state is genuinely justified.
- Reviewer decisions must go through the backend.
- Do not add a real database.
- Do not add real AI calls.
- Do not add authentication.
- Do not overengineer the four-hour exercise.
- Use semantic HTML and accessible controls.
- Test important state transitions and human/agent conflicts.
- Do not rewrite unrelated working code.

## AI working rules

Before making a large change:

1. Inspect the current implementation.
2. Explain what needs to change.
3. Prefer the smallest solution.
4. Do not rewrite unrelated code.

When a product requirement is unclear:

- state the assumption;
- choose the simplest reasonable behaviour;
- record important assumptions for the README.

Never invent work, decisions, AI interactions or test results that did not happen.

============================================================
1. PRODUCT SCENARIO
============================================================

MarvelX builds claims handling software for insurers.

The user of this application is a HUMAN CLAIMS REVIEWER.

The reviewer is not assumed to be technical.

An AI agent reads documents belonging to an insurance claim, such as:

- police report;
- invoice;
- claimant statement;
- policy information.

The agent:

- extracts fields a claims handler needs;
- drafts a claim summary;
- attaches confidence to extracted information;
- provides citations/evidence pointing back to source documents.

The human reviewer watches the agent work and has the FINAL SAY.

The AI is useful but is wrong often enough that human review matters.

Everything emitted by the agent is MODEL OUTPUT.

Do not design the UI as if AI confidence means truth.

============================================================
2. IMPORTANT LIVE-AGENT BEHAVIOUR
============================================================

The agent does NOT produce a final result all at once.

The run happens live.

During a run:

- steps start;
- steps finish;
- summary text arrives in pieces;
- fields are extracted;
- fields have confidence values;
- fields contain citations to source document spans;
- confidence can change later;
- a field can be revised AFTER it has already been emitted;
- the agent can finish successfully;
- the agent can fail part-way through.

The reviewer does NOT need to wait for the run to finish.

The reviewer can act while the agent is still working.

This concurrency between agent output and human decisions is a central part of the assignment.

============================================================
3. REQUIRED FRONTEND
============================================================

Use React + TypeScript.

Build:

A. CLAIMS QUEUE

Show multiple claims.

Each claim should have enough information to be useful, such as:

- id;
- claim ID;
- claimant name;
- status;
- priority;
- updated time;
- confidence if useful.

Statuses must support:

- running;
- needs_review;
- reviewed;
- failed.

Provide at least ONE filter.

Use a status filter unless the existing design gives a good reason otherwise.

Queue entries must change as runs/reviews progress.

Example:

running
→ needs_review
→ reviewed

Failure:

running
→ failed

Do not add unnecessary filtering/sorting.

------------------------------------------------------------

B. CLAIM REVIEW SCREEN

For one selected claim, show:

- claim identity;
- claim status;
- live agent progress;
- steps the agent takes;
- which steps are pending/running/completed/failed;
- streaming summary;
- extracted fields;
- confidence for fields;
- citation/source evidence;
- AI revisions;
- human reviewer decisions;
- reviewer controls;
- run completion;
- partial failure.

The reviewer should easily understand:

1. What is the agent doing?
2. What does the agent currently believe?
3. Where did that information come from?
4. How confident is the agent?
5. Did the agent change its mind?
6. Has the human already made a decision?
7. Did the agent change something after the human acted?

Do not expose implementation concepts such as JSON/SSE/event objects in the normal reviewer UI.

============================================================
4. LIVE AGENT PROGRESS
============================================================

Do not represent the entire run with only a spinner.

Show meaningful steps.

Example concept:

✓ Read police report
✓ Read invoice
● Check policy
○ Prepare recommendation

Status must NOT depend only on colour.

Use text/icons/labels as appropriate.

============================================================
5. STREAMING SUMMARY
============================================================

The summary must NOT appear fully formed.

The fixture must emit multiple:

summary_delta

events.

The frontend appends the pieces progressively.

Example concept:

Event 1:
"The claimant reported "

Event 2:
"water damage to "

Event 3:
"the kitchen caused by "

Event 4:
"a broken pipe."

The reviewer should visibly experience the summary forming during the run.

============================================================
6. EXTRACTED FIELDS
============================================================

Each extracted field should display:

- understandable field label;
- current AI/model value;
- confidence;
- citation/evidence;
- agent revision information where relevant;
- current reviewer decision if one exists;
- reviewer actions.

Do not visually imply that a high confidence score guarantees correctness.

Evidence/source should remain easy to inspect.

============================================================
7. CITATIONS / SOURCE DOCUMENT SPANS
============================================================

Every extracted field must include a citation back to the span of the source document from which it came.

The data model should include the required concept:

source:
- documentId
- start
- end

Provide small fictional source documents/contents so these offsets can resolve to meaningful evidence.

For example:

Police report:

"The claimant stated that the incident occurred on 12 September 2026 after a pipe burst..."

A citation can identify the relevant character span.

The UI should let the reviewer understand exactly where the AI obtained the information.

A simple accessible implementation is enough:

- evidence snippet;
- expandable source;
- highlighted text;
- small evidence panel;

or another simple approach.

Do NOT build a PDF viewer.

============================================================
8. REVIEWER ACTIONS
============================================================

Every extracted field must support:

ACCEPT

The reviewer agrees with the agent's current value.

CORRECT

The reviewer believes the field/concept is correct but edits an incorrectly extracted value.

OVERRIDE

The reviewer rejects the agent's value/conclusion and supplies their own value.

The reviewer must be able to perform these actions WHILE THE AGENT RUN IS STILL IN PROGRESS.

Reviewer decisions must be submitted through the backend.

They must NOT exist only in React component state.

A reviewer decision should contain at least:

- claimId;
- field;
- action;
- value where relevant;
- timestamp.

If helpful, use a stable field identifier rather than relying only on a display label.

============================================================
9. CORRECT VS OVERRIDE ASSUMPTION
============================================================

The official brief requires both "correct" and "override" but does not fully define their domain distinction.

Unless implementation/domain context gives a better reason, use this documented interpretation:

CORRECT:
The agent identified the correct field/concept, but the extracted value is wrong. The reviewer fixes the value.

OVERRIDE:
The reviewer explicitly rejects the agent's conclusion/value and supplies a human decision instead.

Keep this distinction understandable in the UI/data model.

Document the assumption in the README.

Do not pretend MarvelX specified semantics they did not specify.

============================================================
10. CRITICAL HUMAN-vs-AGENT COLLISION
============================================================

This is one of the most important behaviours.

Example:

Agent initially emits:

damageAmount = €4,250
confidence = 0.75

Human reviewer ACCEPTS:

€4,250

The agent continues reading.

Later the agent revises:

damageAmount = €4,520
confidence = 0.91

The application must NOT silently replace or invalidate the human decision.

We need to preserve enough information to show:

- current/latest AI value = €4,520;
- reviewer previously accepted = €4,250;
- the agent revised the value AFTER the human acted;
- the field therefore deserves renewed attention.

Keep the human decision visible.

Flag the later AI revision clearly.

Do not automatically decide on behalf of the reviewer whether their previous decision should remain final.

The reviewer should understand that something changed and can decide what to do.

============================================================
11. STATE MODEL / PROVENANCE
============================================================

Do NOT model extracted fields like this:

field.value = reviewerValue

if doing so destroys the AI output.

Agent output and human decisions must remain separate concepts.

Conceptually:

AGENT STATE

- current model value;
- confidence;
- citation;
- revision information/history.

HUMAN DECISION

- action;
- human value where relevant;
- timestamp.

Example:

Agent V1:
€4,250

Human correction:
€4,500

Agent V2:
€4,520

The application must still be able to distinguish all of these.

Do not silently merge them into one value.

============================================================
12. DOMAIN TYPES
============================================================

Create explicit TypeScript domain types.

At minimum model:

Claim

Suggested concepts:

- id;
- claimId;
- claimantName;
- status;
- priority;
- updatedAt;
- confidence if useful.

ClaimStatus:

- running
- needs_review
- reviewed
- failed

Priority:

- high
- medium
- low

AgentRun:

- claimId;
- lifecycle status;
- steps;
- streaming summary;
- extracted fields;
- completion/failure information.

AgentStep:

- stable id;
- label;
- status.

Possible step statuses:

- pending;
- running;
- completed;
- failed.

ExtractedField:

- stable field identifier;
- display label;
- current agent value;
- confidence;
- source citation;
- enough revision information to make agent changes visible.

SourceCitation:

- documentId;
- start;
- end.

ReviewerDecision:

- claimId;
- field identifier;
- action: accept | correct | override;
- value where relevant;
- timestamp.

Choose additional fields only where they solve a real requirement.

============================================================
13. RUN EVENT CONTRACT
============================================================

Use an explicit discriminated TypeScript union for run events.

The successful fixture MUST cover ALL of:

- step_started;
- step_finished;
- summary_delta;
- field_extracted;
- field_revised;
- confidence_changed;
- run_finished.

The failure fixture/mode MUST include:

- run_failed.

Each event should contain:

- type;
- claimId;
- timestamp and/or stable ordering information;
- event-specific payload.

Use type-safe exhaustive event handling where practical.

Avoid `any`.

============================================================
14. SIMULATED AGENT FIXTURE
============================================================

There is NO real AI requirement.

Create a realistic but small fixture.

Do not spend excessive time inventing insurance-domain content.

The fixture must demonstrate:

1. step starts;
2. step finishes;
3. streaming summary pieces;
4. extracted fields;
5. confidence;
6. citation;
7. field revision;
8. confidence change;
9. successful finish.

Also provide a second fixture or replay flag for a run that FAILS PART-WAY.

At least one field must be revised AFTER first being emitted.

Example:

Initial:

incidentDate = "10 September 2026"
confidence = 0.72

Later:

incidentDate = "12 September 2026"
confidence = 0.91

The UI must make the revision visible.

Do not silently replace the value without explaining the change.

Also include at least one confidence_changed event in the fixture.

============================================================
15. PARTIAL FAILURE
============================================================

The failed fixture must fail AFTER some useful results have already been emitted.

Example:

✓ Read police report
✓ Extract incident date
✓ Read invoice
✕ Policy check failed

When failure occurs:

- do not erase already-produced useful output;
- clearly explain that the run stopped;
- show what was completed;
- show the failure state;
- preserve useful partial results.

Do not treat a partial failure as if nothing happened.

============================================================
16. AGENT RUN REPLAY
============================================================

MarvelX will run the application themselves.

They need a documented way to replay a run WITHOUT editing source code.

Provide the simplest reliable mechanism.

Preferred example:

Replay run:

[Normal run]
[Failed run]

This can be a small demo/development control.

The normal replay must allow them to observe:

- steps;
- streaming summary;
- field extraction;
- citations;
- confidence changes;
- field revision;
- run completion.

The failed replay must allow them to observe:

- partial useful output;
- run_failed;
- failure UI.

Replay should reset the appropriate simulated run state predictably.

Document exactly how to replay both scenarios in README.

============================================================
17. BACKEND / DATA SLICE
============================================================

Implement a SMALL LOCAL backend/API.

Allowed approaches include:

- framework route handlers;
- lightweight Node server;
- equivalent local backend.

In-memory storage is explicitly allowed.

Do NOT add a production database.

------------------------------------------------------------
QUEUE ENDPOINT
------------------------------------------------------------

Implement an endpoint serving the queue.

Conceptually:

GET /api/claims

Support at least one filter/query parameter.

For example:

GET /api/claims?status=running

Validate the filter.

For an invalid status such as:

GET /api/claims?status=banana

return an explicit appropriate error status such as:

HTTP 400 Bad Request

and a useful error response.

This explicit error path is REQUIRED.

------------------------------------------------------------
RUN EVENTS ENDPOINT
------------------------------------------------------------

Implement one endpoint/stream serving run events for a claim.

If appropriate for the existing stack, prefer simulated SSE because this interaction is primarily server → browser.

Conceptually:

GET /api/claims/:claimId/events

The events should arrive over time rather than all at once.

If SSE becomes unnecessarily fragile or disproportionately complex in the existing repository, another allowed simulated event mechanism may be used.

If choosing something other than SSE, document why.

Do NOT use WebSockets merely to look sophisticated.

------------------------------------------------------------
REVIEWER DECISION ENDPOINT
------------------------------------------------------------

Reviewer decisions must go through the backend.

Conceptually:

POST /api/claims/:claimId/decisions

Validate the request.

Examples:

Accept:

{
  "field": "incident_date",
  "action": "accept"
}

Correct:

{
  "field": "incident_date",
  "action": "correct",
  "value": "12 September 2026"
}

Override:

{
  "field": "coverage",
  "action": "override",
  "value": "covered"
}

Use in-memory storage.

Return meaningful HTTP status codes.

Do not create unnecessary CRUD endpoints.

============================================================
18. SERVER AUTHORITY
============================================================

For this exercise:

- backend/server state is authoritative for persisted reviewer decisions;
- backend/server state should drive claim/run status where practical;
- frontend live events update the visible run;
- do not treat the event stream itself as durable production storage.

Do not overbuild persistence/reconnect infrastructure, but keep the separation conceptually clean.

============================================================
19. LOADING / ERROR / EMPTY STATES
============================================================

The brief explicitly requires loading, error and empty states.

Implement at minimum:

CLAIMS QUEUE LOADING

Example:
"Loading claims..."

A simple skeleton/spinner is fine.

CLAIMS QUEUE ERROR

Example:
"We couldn't load the claims."

Provide retry where reasonable.

EMPTY FILTER RESULT

Example:
"No failed claims."

Do not leave a blank screen.

CLAIM/REVIEW LOADING

Show appropriate loading state while initial review data is being prepared/fetched if applicable.

REVIEWER ACTION ERROR

If Accept/Correct/Override fails, do not pretend it succeeded.

Show useful feedback and preserve the user's context.

AGENT FAILURE

Clearly show the partial run failure without deleting already-produced output.

============================================================
20. RESPONSIVE DESIGN
============================================================

Responsive styling is required.

The application should work reasonably on:

- normal desktop;
- smaller/mobile viewport.

Desktop can use queue/detail layout if appropriate.

On small screens, stack/reflow content.

Do not spend excessive time on elaborate responsive design.

Prioritize:

- readable hierarchy;
- clear status;
- readable evidence;
- accessible actions;
- understandable forms.

============================================================
21. BASIC ACCESSIBILITY
============================================================

Accessibility is required.

At minimum:

- semantic HTML;
- real <button> elements for buttons;
- form labels;
- keyboard-accessible controls;
- visible focus states;
- useful accessible names;
- logical heading hierarchy;
- state/status must not rely only on colour;
- errors should be understandable;
- do not create clickable divs;
- use aria-live only when useful for changing/streaming content and avoid overwhelming screen-reader users.

If edit/override UI opens dynamically, keep focus behaviour understandable.

Do not attempt an enormous accessibility framework.

============================================================
22. UI / DESIGN PRINCIPLES
============================================================

There is NO DESIGNER.

Design decisions are part of the assessment.

The application is for a non-technical reviewer.

Prefer:

- clear hierarchy;
- plain language;
- visible evidence;
- understandable state;
- restrained styling;
- obvious actions.

Avoid:

- developer terminology;
- unnecessary dashboards;
- excessive animations;
- making confidence look like certainty;
- hiding provenance.

A useful design priority is:

Evidence/source > confidence alone.

============================================================
23. TESTING
============================================================

The assignment is timeboxed.

Do not spend most of the exercise creating tests.

Use the existing test tooling if available.

Prioritize tests around risky behaviour.

Where practical, cover at least:

1. field_extracted updates run state correctly;
2. field_revised updates the AI state correctly;
3. a later agent revision does NOT destroy an existing human decision;
4. queue status filter validation/API behaviour;
5. one reviewer decision flow.

If time requires cutting a test, document the trade-off rather than creating meaningless tests.

Prefer behavioural/domain tests over implementation-detail tests.

============================================================
24. FRAMEWORK / STATE MANAGEMENT
============================================================

FIRST inspect the repository.

Reuse its existing framework, package manager, styling and testing setup where reasonable.

Do not replace a good existing setup unnecessarily.

If starting from scratch, choose a small React + TypeScript setup capable of supporting the frontend and local backend cleanly.

Next.js + TypeScript route handlers is acceptable.

Vite + a lightweight Node backend is also acceptable.

Choose based on simplicity.

Do NOT automatically install Redux.

For live run state, prefer a reducer/local feature state if sufficient.

Redux/global state should only be introduced if there is an actual cross-application state requirement that justifies it.

Do not use useMemo/useCallback/React.memo everywhere without a measured/reasoned need.

============================================================
25. SUGGESTED CODE ORGANIZATION
============================================================

Do not follow this mechanically if the repository already has a better structure.

Conceptually separate:

domain/
- types
- event/state transition logic

fixtures/
- claims
- source documents
- successful run
- failed run

server/api/
- queue
- event stream
- reviewer decisions
- in-memory store

features/components/
- claim queue
- status filter
- claim review
- agent progress
- streaming summary
- extracted field
- evidence/citation
- reviewer decision controls
- replay controls

tests/
- important domain/API/component behaviour

prompts/
- actual prompts used

docs/
- actual agreed plan if used

Keep modules understandable.

Avoid giant components where practical.

Avoid creating abstraction layers that have only one trivial implementation.

============================================================
26. README — REQUIRED
============================================================

The README is part of the assessment, not an afterthought.

Include:

- what the project is;
- setup command;
- run command;
- test command;
- replay instructions;
- how to trigger normal run;
- how to trigger failed run;
- approximately how long was actually spent;
- what was deliberately cut to stay within the timebox.

Do not fabricate the time spent.

Then include ALL SEVEN sections below.

============================================================
README 1 — STATE AND DATA CONTRACT
============================================================

Required heading:

## State and data contract

Explain briefly:

- how Claim relates to AgentRun;
- how run events update the run;
- how agent fields are represented;
- how citations are represented;
- how reviewer decisions are represented;
- how queue status relates to run/review status;
- why agent output and reviewer decisions are separate;
- how the model handles an agent revision after the human already acted.

Refer to actual files/types/reducers/services from the final repository.

Do not write generic architecture prose disconnected from the implementation.

============================================================
README 2 — DESIGN DECISIONS
============================================================

Required heading:

## Design decisions

Explain THREE actual design decisions made for a non-technical reviewer.

Good candidates IF they match the implementation:

1. Meaningful agent progress instead of a generic spinner.
2. Citation/evidence kept close to each extracted field.
3. Explicit distinction between agent revision and human reviewer decision.
4. Confidence kept secondary to evidence.

Then answer:

What is one thing you would want to watch a real reviewer do before trusting the screen?

A strong candidate IF this matches the final product:

Watch how reviewers respond when the agent changes a field AFTER they already accepted/corrected/overrode it.

We are making a product assumption about how that conflict should be presented.

Do NOT claim this has been validated with real claims reviewers.

============================================================
README 3 — WHAT THE AGENT DID AND WHAT I DID
============================================================

Required heading:

## What the agent did and what I did

MarvelX requires:

- TWO places where I rejected or reworked AI assistant output;
- what was wrong with it;
- ONE place where I accepted AI output as-is;
- why I accepted it.

CRITICAL:

DO NOT FABRICATE THIS SECTION.

During development, maintain short notes of REAL AI interactions.

For each actual rejected/reworked suggestion, record:

- what Codex proposed/generated;
- why I disagreed;
- what changed.

For the accepted example:

- what Codex produced;
- why it was appropriate;
- what I checked before accepting it.

Potential examples must ONLY be used if they genuinely happen.

Do not create fake mistakes merely to make the README interesting.

============================================================
README 4 — THE NEXT TICKET
============================================================

Required heading:

## The next ticket

Future requirement:

"A reviewer can accept every field above a chosen confidence threshold across all claims in their queue, in one action."

DO NOT BUILD THIS FEATURE.

Explain:

- where this feature would land in the current architecture;
- which domain logic/service/API would need to change;
- what a mid-level engineer using an AI agent is most likely to get wrong;
- what existing code/types/tests/architecture reduce that risk.

Important risks to consider where relevant:

- overwriting existing human corrections/overrides;
- accepting stale AI values;
- AI revision occurring while bulk processing happens;
- trusting frontend state instead of authoritative backend state;
- treating confidence as proof of correctness;
- partial success across multiple claims;
- duplicate/repeated bulk requests/idempotency.

Do not overdesign a solution.

The point is to show that the current code can be extended safely.

============================================================
README 5 — SOMETHING WE DID NOT ASK FOR
============================================================

Required heading:

## Something we did not ask for

Describe ONE real decision taken beyond the explicit brief.

Preferred candidate IF implemented:

When the agent revises a field after a reviewer already acted, preserve the human decision and flag the new agent revision instead of silently replacing the human decision.

Explain why this protects reviewer understanding/provenance.

If another stronger real decision emerges, use that instead.

Do not invent a feature just to answer this section.

============================================================
README 6 — PUSHBACK
============================================================

Required heading:

## Pushback

Give ONE constructive thing I would change about the hiring brief.

Preferred issue:

The brief requires both "correct" and "override" but does not clearly define their business semantics.

Explain briefly that in a real product I would clarify this with product/domain experts because the distinction affects:

- UX;
- audit history;
- analytics;
- data model;
- future automation.

State the interpretation chosen for this take-home.

Keep this constructive.

Do not complain about the four-hour limit.

============================================================
README 7 — WHAT NEXT, AND WHAT YOU LEFT OUT
============================================================

Required heading:

## What next, and what you left out

Explain what would be needed next for a real production product.

Possible items:

- persistent database;
- authentication/authorization;
- durable audit history;
- reconnect/resume semantics;
- event replay/resumption;
- real AI/agent integration;
- production observability;
- concurrency/idempotency protection;
- stronger validation;
- usability testing with real claims reviewers;
- broader automated testing.

Also explicitly explain what was deliberately skipped because this is a four-hour exercise.

Do not imply the take-home is production-ready.

============================================================
27. FUTURE-TICKET SAFETY IN CURRENT ARCHITECTURE
============================================================

Even though the bulk-confidence ticket must NOT be implemented, current architecture should avoid making it dangerous to implement later.

Especially:

Do not store:

effectiveValue = reviewerValue || agentValue

as the only representation if that destroys provenance.

Do not design bulk operations around browser-only state.

Keep reviewer decisions explicit.

Keep stable field identifiers.

Keep the latest agent state distinguishable from human decisions.

This will make the README discussion of the next ticket credible.

============================================================
28. THINGS WE DELIBERATELY DO NOT NEED
============================================================

Unless already present and essentially free to use, do NOT spend time building:

- real OpenAI/Claude/LLM calls;
- real insurance integrations;
- production authentication;
- authorization system;
- production database;
- microservices;
- Kubernetes;
- elaborate Docker setup;
- WebSockets when SSE/local stream is sufficient;
- complex caching;
- event-sourcing infrastructure;
- full design system;
- PDF viewer;
- elaborate animation;
- excessive charts;
- unnecessary global state;
- excessive memoization;
- exhaustive test suite;
- complicated deployment infrastructure.

If something is intentionally omitted, document the relevant trade-off.

============================================================
29. PRODUCT DECISION TO PRESERVE
============================================================

Unless we explicitly change this decision after reviewing it:

When the human has already acted on a field and the AI later revises that field:

DO:

- preserve the human decision;
- preserve/show the latest AI value;
- indicate that the AI revised the value after the reviewer acted;
- let the reviewer understand/revisit the conflict.

DO NOT:

- silently overwrite the human decision;
- silently mark the human as accepting the new AI value;
- delete the previous human action;
- automatically decide the conflict for the human.

============================================================
30. FOUR-HOUR PRIORITY ORDER
============================================================

Optimize implementation roughly in this order:

1. Understand/reuse repository.
2. Domain types.
3. Fixture/event contract.
4. Queue backend endpoint.
5. Queue UI + filter.
6. Claim review vertical slice.
7. Live event stream/replay.
8. Agent steps.
9. Streaming summary.
10. Field extraction.
11. Citation/evidence.
12. Accept/correct/override through backend.
13. Agent revision.
14. Human-vs-agent collision behaviour.
15. Confidence change.
16. Successful finish/status transition.
17. Failed run/partial failure.
18. Loading/error/empty states.
19. Responsive/accessibility pass.
20. Focused tests.
21. README.
22. Final requirement audit.

If time becomes tight:

DO NOT sacrifice required behaviour for decorative polish.

============================================================
31. DEFINITION OF DONE — OFFICIAL REQUIREMENT AUDIT
============================================================

Before declaring the project complete, verify EVERY item.

FRONTEND

[ ] React
[ ] TypeScript
[ ] claims queue
[ ] multiple claims
[ ] at least one queue filter
[ ] queue entries change as runs progress
[ ] running status
[ ] needs_review status
[ ] reviewed status
[ ] failed status
[ ] review screen
[ ] live agent steps
[ ] step starting visible
[ ] step finishing visible
[ ] streaming summary
[ ] extracted fields
[ ] field confidence
[ ] citation for each extracted field
[ ] citation points to source document span
[ ] accept action
[ ] correct action
[ ] correct supports edited value
[ ] override action
[ ] override supports reviewer value
[ ] reviewer can act while run is still running
[ ] agent field revision visible
[ ] confidence change visible
[ ] AI-originated changes distinguishable from human changes
[ ] later AI revision does not silently overwrite human decision
[ ] loading state
[ ] error state
[ ] empty state
[ ] part-way run failure
[ ] useful partial results preserved after failure
[ ] responsive styling
[ ] basic accessibility

AGENT RUN / FIXTURE

[ ] fixture authored locally
[ ] step_started
[ ] step_finished
[ ] summary_delta
[ ] field_extracted
[ ] field_revised
[ ] confidence_changed
[ ] run_finished
[ ] run_failed scenario
[ ] events occur over time
[ ] replay mechanism
[ ] replay does not require source editing
[ ] normal replay documented
[ ] failed replay documented

BACKEND

[ ] local backend/API exists
[ ] queue endpoint exists
[ ] queue endpoint supports query/filter parameter
[ ] query parameter validated
[ ] invalid query has explicit appropriate HTTP error status
[ ] run events endpoint/stream exists
[ ] reviewer decisions pass through backend
[ ] reviewer decision payload validated
[ ] in-memory storage works
[ ] useful HTTP error responses

STATE / DATA

[ ] explicit Claim type
[ ] explicit statuses
[ ] explicit priorities
[ ] explicit AgentRun model
[ ] explicit AgentStep model
[ ] explicit ExtractedField model
[ ] explicit SourceCitation model
[ ] explicit ReviewerDecision model
[ ] discriminated RunEvent union
[ ] agent output separate from reviewer decisions
[ ] provenance preserved
[ ] AI revision history/change can be understood
[ ] human/AI collision handled explicitly

ACCESSIBILITY

[ ] semantic controls
[ ] labels
[ ] keyboard use
[ ] focus visibility
[ ] status not colour-only
[ ] useful headings
[ ] understandable error messages
[ ] dynamic announcements considered sensibly

RESPONSIVE

[ ] desktop usable
[ ] smaller viewport usable
[ ] controls remain usable
[ ] evidence remains readable

TESTING

[ ] important event/state transition tested
[ ] field revision tested
[ ] human decision survives later AI revision
[ ] queue filter/API validation tested where practical
[ ] reviewer decision flow tested where practical

AI CONFIGURATION

[ ] actual AGENTS.md committed
[ ] this actual initial prompt preserved
[ ] actual later substantial prompts preserved if used
[ ] actual agreed plan preserved if used
[ ] real AI interaction notes maintained
[ ] no fake CLAUDE.md
[ ] no fake skills
[ ] no fake rules
[ ] no fabricated AI history
[ ] final committed agent configuration reflects what was actually used

README

[ ] setup instructions
[ ] run instructions
[ ] test instructions
[ ] replay instructions
[ ] normal replay explained
[ ] failure replay explained
[ ] actual approximate time spent
[ ] deliberate cuts/timebox explained

[ ] State and data contract
[ ] Design decisions
[ ] three design decisions
[ ] real-reviewer observation question answered
[ ] What the agent did and what I did
[ ] two REAL rejected/reworked AI outputs
[ ] one REAL accepted AI output
[ ] The next ticket
[ ] future ticket NOT implemented
[ ] extension point explained
[ ] likely mistakes explained
[ ] current safeguards explained
[ ] Something we did not ask for
[ ] Pushback
[ ] What next, and what you left out

============================================================
32. FINAL QUALITY QUESTIONS
============================================================

Before completion, review the implementation as if you are the Engineering Lead interviewing me.

Ask:

- Can I tell what the AI currently believes?
- Can I tell what the human decided?
- Can I tell when the AI changed its mind?
- Can I tell when that happened after the human acted?
- Can I verify the AI output using source evidence?
- Can I act before the run finishes?
- Does a partial failure preserve useful work?
- Does the queue reflect lifecycle changes?
- Are backend responsibilities real rather than mocked entirely in React?
- Is the code understandable?
- Is the state model defensible?
- Is the TypeScript useful rather than decorative?
- Is accessibility reasonable?
- Is the UI usable on a smaller screen?
- Can another engineer extend this?
- Did we stay reasonably within the four-hour spirit?
- Can I personally explain every important decision?

If the answer to any required item is no, report it rather than hiding it.

============================================================
33. WORKING PROCESS — DO NOT SKIP
============================================================

DO NOT immediately generate the entire application.

PHASE 1 — INSPECT

Inspect the repository first.

Tell me:

- current framework;
- React version if applicable;
- TypeScript setup;
- package manager;
- styling setup;
- testing setup;
- existing API/backend capability;
- current directory structure;
- anything reusable;
- anything problematic.

PHASE 2 — PLAN

Before modifying application code, propose the smallest architecture that satisfies the brief.

Explain in SIMPLE ENGLISH:

- frontend structure;
- backend structure;
- state model;
- event model;
- reviewer decision model;
- fixture model;
- replay mechanism;
- human/AI collision behaviour;
- citation approach;
- testing approach.

Show the proposed file structure.

PHASE 3 — ASSUMPTIONS

List assumptions.

Especially document:

- correct vs override semantics;
- what happens when AI revises after human action;
- how a claim becomes needs_review;
- how it becomes reviewed;
- what replay resets;
- what happens to reviewer decisions during replay.

Do not invent unnecessary assumptions.

PHASE 4 — REQUIREMENT MAP

Map EVERY official requirement to where you plan to implement it.

Use a checklist.

Do not skip small requirements such as:

- confidence_changed;
- citation span;
- empty state;
- explicit queue API error path;
- failed run;
- responsive;
- accessibility;
- replay without editing code;
- reviewer action while running;
- actual agent configuration.

PHASE 5 — TIME PLAN

Give a realistic four-hour implementation order.

Separate:

MUST HAVE

from:

POLISH IF TIME REMAINS.

Do not classify any official required behaviour as optional polish.

PHASE 6 — STOP

After inspection and planning:

STOP.

Do not implement application code yet.

Wait for my approval.

============================================================
34. YOUR FIRST RESPONSE TO ME
============================================================

Your first response must contain ONLY the planning/inspection result, not application implementation.

Give me:

1. Repository inspection
2. Existing technology/setup
3. Proposed architecture
4. Proposed file structure
5. State/data model explained in simple English
6. Event flow explained in simple English
7. Human-vs-agent collision behaviour
8. Backend endpoints
9. Replay design
10. Accessibility/responsive approach
11. Testing approach
12. Assumptions
13. Requirement-by-requirement mapping
14. Four-hour implementation plan
15. Risks or concerns you see

Then STOP.

Wait for my approval before changing application code.
