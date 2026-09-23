# Agent-Assisted Claims Review

## Goal

Build the MarvelX Product Engineer take-home as a small, maintainable React + TypeScript application. The assignment is timeboxed to around four hours. Prefer simple, understandable solutions over unnecessary architecture.

## Core product rules

1. Agent output and reviewer decisions are separate data.
2. Never silently overwrite a reviewer decision when the agent later revises a field.
3. Preserve provenance: the UI must make clear whether a change came from the agent or the reviewer.
4. Reviewer decisions must be validated and stamped by the backend; the serverless demo keeps the active snapshot in the browser session rather than relying on cross-request server memory.
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
- Do not add a real database, real AI calls, or authentication.
- Do not overengineer the four-hour exercise.
- Use semantic HTML and accessible controls.
- Test important state transitions and human/agent conflicts.
- Do not rewrite unrelated working code.

## AI working rules

Before making a large change: inspect the current implementation, explain what needs to change, prefer the smallest solution, and do not rewrite unrelated code.

When a product requirement is unclear, state the assumption, choose the simplest reasonable behaviour, and record important assumptions for the README.

Never invent work, decisions, AI interactions, or test results that did not happen.
