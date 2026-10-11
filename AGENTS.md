# Working on Taskline

Read [PLAN.md](PLAN.md) before changing behavior. Prefer a small, explainable
solution that preserves the task and audit rules.

## Repository map

- `apps/web/src`: React components, queries, and the HTTP client.
- `apps/api/src`: Express routes, task service, and SQL repository.
- `packages/shared/src`: status vocabulary and Zod request/response contracts.
- `supabase/migrations`: ordered database changes; never rewrite an applied migration.

## Working habits

1. Read the relevant contract, implementation, and caller before editing.
2. State assumptions when requirements leave a choice open.
3. Keep HTTP handling, domain decisions, and SQL separate.
4. Validate external input with the shared schemas. Avoid `any`, unchecked
   assertions, and abstractions that have only a hypothetical caller.
5. Use names from the domain. Comments explain reasons and invariants.
6. Reuse native accessible controls and the existing CSS tokens.
7. Keep changes within the requested feature. Update documentation when behavior
   or setup changes.

## Rules that must survive every change

- A task starts at `to_do` and advances one step at a time.
- A same-status request does not update timestamps or append an audit record.
- Status changes and their audit records succeed or fail together.
- Audit records cannot be edited, deleted, truncated, or removed by task deletion.
- Deleted tasks cannot be changed or restored through the API.
- Actor selection is attribution; it is not proof of identity.
- Database credentials stay on the server and outside Git.

## Checks and evidence

- `npm run check`: TypeScript, lint, and formatting.
- `npm run build`: compile the backend and build the frontend.
- If asked to test behavior, cover invalid transitions, repeated requests,
  concurrent updates, rollback, and audit retention before cosmetic details.
- Describe the actual checks performed and their results. Never claim an
  unperformed test passed.
- Keep the AI-use section in the README accurate. Explain decisions and
  limitations; do not invent human review or verification.

## Git and external services

Commit only when the user authorizes it. Use the repository's configured human
author and committer identity; do not add AI attribution to commit metadata.
Make feature-sized commits and inspect staged files for secrets. Do not rewrite
history or change existing external resources without an explicit request.
