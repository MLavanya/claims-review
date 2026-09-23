I reviewed the plan. The overall architecture is approved, but make the following corrections before implementation.

1. Keep AgentRun state and ReviewerDecision state clearly separate.

The runReducer should process agent/run events only:
- step_started
- step_finished
- summary_delta
- field_extracted
- field_revised
- confidence_changed
- run_finished
- run_failed

Do not gradually turn runReducer into the owner of reviewer decisions.

Reviewer decisions are backend-persisted state returned by the API.

The UI may derive a view from:

latest agent field
+
latest reviewer decision
+
their versions/order

but these remain separate source concepts.

2. Give each agent field a simple monotonically increasing version, or use an equally simple event-order mechanism.

When a reviewer acts, store which agent field version they reviewed.

Conceptually:

ReviewerDecision:
- id
- claimId
- fieldId
- action
- value where relevant
- decidedAt
- reviewedAgentVersion

ExtractedField:
- id
- label
- value
- confidence
- source
- version
- lightweight revision/history information

If:

field.version > decision.reviewedAgentVersion

then the UI can identify that the agent changed the field after the human decision.

Keep this simple and easy to explain.

3. Treat the rule for `reviewed` as our documented assumption, not a MarvelX-defined rule.

Use:

- while the run is active, claim status remains `running`, even if the reviewer has acted on every currently visible field;
- after run_finished, if every latest extracted field has a current reviewer decision against its latest version, the claim may become `reviewed`;
- otherwise it becomes `needs_review`;
- if a field revision makes a previous decision stale before completion, that field requires renewed review;
- run_failed remains `failed`, even if some fields were reviewed.

Document this assumption.

4. Do not build a separate audit subsystem.

A simple append-only in-memory ReviewerDecision[] is enough to preserve repeated human actions/history.

Do not introduce AuditService, AuditRepository, AuditEvent or similar architecture.

5. Stable event sequence IDs are approved as a small duplicate-event safeguard.

Keep this minimal.

Do not build event sourcing or production-grade stream recovery.

6. Do not hardcode fragile source citation offsets.

For fixtures, derive start/end from known evidence text where practical and assert that the evidence exists.

The final SourceCitation still contains:
- documentId
- start
- end

7. Make confidence movement visible.

Handling confidence_changed internally is not enough.

The reviewer should be able to see that confidence changed, for example:

72% → 91%

Preserve only enough lightweight history to communicate this.

Do not build a complex confidence-history subsystem.

8. Keep GET /api/claims/:claimId.

It is a justified small addition for initial hydration:

open claim
→ fetch current server snapshot
→ render
→ connect to SSE
→ apply later events

9. Keep accessibility practical for the timebox.

Semantic controls, labels, keyboard operation, visible focus, non-colour status, understandable errors and sensible live announcements are required.

Do not spend disproportionate time building custom focus-management infrastructure before core requirements are complete.

10. Keep tooling lightweight.

ESLint is fine, but do not spend significant time creating an elaborate lint configuration.

The important commands must work reliably:
- npm run dev
- npm test
- npm run typecheck

11. Preserve the approved stack and overall architecture:

- React
- TypeScript
- Vite
- Express
- SSE
- plain CSS
- Vitest
- focused React Testing Library usage
- Supertest
- no Redux
- no real AI
- no database
- no authentication

12. Preserve the honest AI workflow.

Create and actually use:
- AGENTS.md
- prompts/01-initial-plan.md containing the exact original prompt
- prompts/02-plan-review.md containing this exact prompt
- docs/implementation-plan.md containing the final approved plan
- docs/ai-development-notes.md for factual notes during implementation

Do not create:
- CLAUDE.md unless Claude is actually used
- fake skills
- fake rules
- fabricated AI interactions

13. Before implementing application code, update the proposed plan mentally with these corrections.

Then proceed with implementation in the agreed priority order.

Important working rule:

Do not try to impress through code volume.

Prefer the smallest implementation that completely satisfies the assignment.

During implementation, if you generate an approach and then discover it is wrong, too complicated, unsafe, or inconsistent with these rules, record that fact briefly in docs/ai-development-notes.md. Do not manufacture examples merely to satisfy the README.

At the end:

1. run typecheck;
2. run tests;
3. verify normal replay;
4. verify failed replay;
5. verify accept/correct/override while running;
6. verify an agent revision after a human decision;
7. verify visible confidence change;
8. verify source citations;
9. verify queue status/filter/error behavior;
10. verify loading/error/empty states;
11. check desktop and narrow layout;
12. audit every original MarvelX requirement;
13. complete README from what was ACTUALLY implemented;
14. report anything incomplete honestly.

You may now implement the application.
