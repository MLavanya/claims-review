# Approved implementation plan

Use React, TypeScript, Vite, Express, SSE, plain CSS, Vitest, focused React Testing Library, and Supertest. Keep the run reducer agent-only. Store reviewer decisions separately on the server in an append-only array, including the reviewed agent field version. A later field version makes that decision stale without overwriting it.

Implement in this order: workflow artifacts; strict shared domain types and reducer; derived citation fixtures; authoritative in-memory API and timed replay; queue and review UI; reviewer actions; accessibility and responsive pass; focused tests; README and final audit.

The server owns claim status. Active runs stay `running`. On successful completion, a claim becomes `reviewed` only when every latest field version has a current decision; otherwise it becomes `needs_review`. Failed runs remain `failed`. Replay resets the selected simulated run and its decisions.

The UI hydrates from `GET /api/claims/:claimId`, connects to SSE, and applies only later agent events locally. Evidence is resolved from start-inclusive/end-exclusive source spans. Normal and failed replay are exposed as controls and require no source changes.

