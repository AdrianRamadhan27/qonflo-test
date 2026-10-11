# Taskline

A small Kanban task manager built for the Qonflo take-home task. Create work,
move it through four statuses, and see who changed each task and when.

[Live demo](https://qonflo-test.vercel.app)

`to_do → pending → in_progress → done`

Select an actor, then drag a card into the next column or use its move button.
Open a card to read its history. Deleted tasks have a separate view so their
retained history stays accessible.

## Run locally

Requires Node.js 24 and PostgreSQL 14 or later. Supabase Postgres also works.

```sh
npm ci
cp .env.example .env
```

Create a database and edit `.env` with two connections to that database:

- `ADMIN_DATABASE_URL`: the database owner, used only for migrations.
- `DATABASE_URL`: the `qonflo_app` login with a password you choose. The migration
  creates this role and sets its password from the URL.
- `DATABASE_SSL=false` for local Postgres. Use `true` and the provider's PEM
  certificate in `DATABASE_SSL_CA` for Supabase.

Then run:

```sh
npm run db:migrate
npm run db:seed  # optional: four examples with real audit records
npm run dev
```

Frontend: <http://127.0.0.1:5173>. Backend: <http://localhost:3001/api>.
Vite proxies API requests to Express. To run them separately, build the shared
package first, then use `npm run dev -w @taskline/api` and
`npm run dev -w @taskline/web` in separate terminals.

## Architecture

| Location              | Responsibility                                      |
| --------------------- | --------------------------------------------------- |
| `apps/web`            | React UI, drag controls, API client, TanStack Query |
| `apps/api`            | Express routes → task service → SQL repository      |
| `packages/shared`     | Zod contracts, status definitions, TypeScript types |
| `supabase/migrations` | Tables, constraints, triggers, database privileges  |
| `api/index.ts`        | The same Express app exported for Vercel            |

Postgres is the source of truth. The service locks a task row before checking
its current status. A same-status request returns `changed: false` without a
write. A valid update triggers an audit insertion in the same transaction; an
insertion failure rolls both changes back. History reads use one database
snapshot and sort by timestamp, then numeric audit ID.

The UI waits for server confirmation and refreshes its queries after a mutation.
Dragging and move buttons share one handler. Keyboard dragging uses Space/Enter,
Left/Right, then Space/Enter to drop; Escape cancels. Touch users can use the grip.

## API

All paths start with `/api`; write requests use JSON.

| Method | Path                    | Input / result                            |
| ------ | ----------------------- | ----------------------------------------- |
| GET    | `/actors`               | `{ actors }`                              |
| GET    | `/tasks`                | `{ tasks }`; `?deleted=true` for deleted  |
| POST   | `/tasks`                | `title`, `description?`, `actorId` → task |
| PATCH  | `/tasks/:id/status`     | `status`, `actorId` → `{ task, changed }` |
| DELETE | `/tasks/:id`            | `actorId` → `{ task }`                    |
| GET    | `/tasks/:id/audit-logs` | `{ task, logs }`, including deleted tasks |
| GET    | `/health`               | Database readiness                        |

Creation returns `201`. Invalid input returns `400`, missing/deleted writable
tasks `404`, and forbidden transitions `409`. Errors use
`{ error: { code, message } }`. Repeated deletion returns the retained task.

## Assumptions and trade-offs

- Three predefined actors provide attribution. There is no authentication, as
  requested; an actor selection does not prove who made a request.
- Titles and descriptions cannot be edited. Only status and deletion change.
- Deletion is permanent in the UI and preserves the database record. Creation
  and deletion appear as context in the timeline; audit records cover status changes.
- Cards are ordered by creation time. Dragging changes status.
- Explicit SQL keeps the locking and audit behavior visible. Database triggers
  add a second validation boundary at the cost of maintaining some rules in SQL.
- Reads return all tasks for this small exercise. Updates are not optimistic,
  and other users' changes become visible on query refresh rather than in real time.

## Review questions

**How is audit history protected?** The runtime role can only read audit records;
it cannot insert, update, delete, or truncate them. The status trigger owns the
insertion path. Additional triggers reject record changes and table truncation,
and tasks are soft-deleted with a restrictive foreign key. A privileged database
owner can still alter the schema or disable guards; administrative access needs
separate controls and backups in a production system.

**What is riskiest with many users?** Unbounded reads and growing numbers of warm
server processes can exhaust database capacity. A frequently updated task also
serializes requests on its row lock. Attribution is another limit: public demo
users can select any predefined actor.

**What would I refactor first?** Add cursor pagination to repository reads and
API responses, keeping the service and transactional audit boundary. This bounds
database work and UI payloads. Before real internal use, add authenticated actors,
concurrency/rollback tests, request tracing, and monitoring.

## Deployment

`vercel.json` hosts the Vite build and Express function in one project. Supabase
stores data in the private `task_manager` schema. Apply migrations separately;
the deployed function only needs `DATABASE_URL`, `DATABASE_SSL=true`, and
`DATABASE_SSL_CA`. Keep the admin connection off the runtime host.

Use Supabase's [transaction pooler](https://supabase.com/docs/guides/database/connecting-to-postgres)
with `qonflo_app.PROJECT_REF` as the runtime username. Prepared statements are
disabled for pooler compatibility; TLS certificate verification stays enabled.
The demo uses Vercel Hobby and Supabase Free. Supabase may pause a free project
after inactivity; check it before sharing the submission.

## AI assistance and validation

Codex assisted with the plan, TypeScript implementation, database migration,
Kanban UI, documentation, and deployment. [PLAN.md](PLAN.md) records the decisions
and implementation stages. [AGENTS.md](AGENTS.md) defines boundaries, invariants,
and evidence requirements for future agent work.

Checks performed: `npm run check` (strict types, lint, formatting), `npm run build`,
applying the migration and example seed to local Postgres and Supabase, and
viewing the board and history drawer in the browser. Automated behavioral and
concurrency tests have not been run; adding those is the first validation improvement.
