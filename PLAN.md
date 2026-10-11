# Taskline implementation plan

## Goal

Build a small task manager that makes each status change easy to understand:
which task changed, who changed it, the previous and next status, and when.

## Scope and assumptions

- React and TypeScript frontend; Express and TypeScript backend.
- PostgreSQL stores tasks and their audit records.
- Tasks have a title, optional description, status, creator, and timestamps.
- Every task starts at `to_do`.
- Allowed progression: `to_do → pending → in_progress → done`.
- Users select an actor from three predefined people. This is attribution, not authentication.
- Deleting a task removes it from the active list. Its record and history remain available.
- Creation and deletion are not status changes and do not create status audit records.

## Structure

```text
apps/web/         React UI, API client, and feature components
apps/api/         Express routes, task service, and database access
packages/shared/ Status definitions, request schemas, and response types
supabase/        SQL migrations and optional example data
api/             Hosting entry point that exports the Express app
```

Routes handle HTTP concerns. The task service owns application decisions.
Database queries stay in a small repository module. Shared contracts keep the
frontend and backend vocabulary consistent without a separate generated SDK.

## Data rules

1. Validate request bodies, actor IDs, task IDs, and status values at the API boundary.
2. Lock the task row before evaluating a status change.
3. If the requested status is already current, return the task without updating it.
4. Reject skipped, backward, or unknown statuses.
5. Update the status and actor within a short database transaction.
6. A database trigger appends the audit record within that transaction. A failure
   rolls back both the task update and the new record.
7. Database guards also reject invalid transitions and changes to deleted tasks.
8. Audit records reject update, delete, and truncate operations. The application
   database role can read audit records but cannot write them directly.
9. Soft deletion preserves the task identity and prevents cascading log deletion.
10. Read audit records oldest first, using the record ID to break timestamp ties.

Concurrent requests for the same next status serialize on the row lock. The first
changes the task; the second sees the new status and becomes a no-op. Requests for
different statuses are evaluated against the latest committed status.

## API

All routes use `/api`. Errors have one `{ error: { code, message } }` shape.

| Method | Path                    | Purpose                                                  |
| ------ | ----------------------- | -------------------------------------------------------- |
| GET    | `/actors`               | Predefined actor list                                    |
| GET    | `/tasks`                | Active tasks; `?deleted=true` reads deleted tasks        |
| POST   | `/tasks`                | Create a task with `title`, `description`, and `actorId` |
| PATCH  | `/tasks/:id/status`     | Set `status` and `actorId`; report whether it changed    |
| DELETE | `/tasks/:id`            | Soft-delete a task with `actorId`                        |
| GET    | `/tasks/:id/audit-logs` | Task details and chronological status history            |

Use `201` for creation, `400` for malformed input, `404` for missing tasks, and
`409` for a forbidden transition. Do not expose database errors or credentials.
List all tasks for this small exercise; pagination is a later scaling change.

## User experience

- A compact task list and adjacent history panel, stacked on small screens.
- Status labels and a four-step progression make the workflow visible.
- One explicit next-status action per task prevents accidental skips.
- An actor selector stays visible near the primary actions.
- A short create form and a delete confirmation use native accessible controls.
- The history shows actor, status pair, and a complete localized timestamp.
- A deleted-task view keeps retained history discoverable.
- Loading, empty, error, focus, and disabled states are part of the implementation.
- Wait for server confirmation before changing the displayed status. Preserve
  input after errors, show actionable feedback, and refresh stale task data.

## Implementation stages

1. Project scaffold, strict TypeScript, shared contracts, and agent guidance.
2. Database schema, immutable audit rules, and reproducible migrations.
3. Task API, status validation, consistent errors, and database transactions.
4. Task list, creation, deletion, actor selection, and status actions.
5. Audit history panel, deleted-task history, and responsive interaction states.
6. Hosting entry point and concise documentation of setup and trade-offs.

Make each stage a separate commit when it is complete.

## Completion checklist

- Frontend and backend compile; lint and formatting checks pass.
- Every required action has a clear route and a corresponding UI interaction.
- Same-status requests have no update or audit insertion path.
- Invalid transitions fail in the backend and at the database boundary.
- A failed audit insertion cannot leave a changed task behind.
- Deletion preserves audit records and their original task title.
- The README explains how to run the app, the main risks, future refactors, and
  exactly what AI assisted with and which checks were performed.
- `AGENTS.md` tells coding agents where to work, which invariants to preserve,
  and how to report checks honestly.
