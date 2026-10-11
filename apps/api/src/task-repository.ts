import type postgres from 'postgres';
import type { Actor, ActorId, AuditLog, CreateTaskInput, Task, TaskStatus } from '@taskline/shared';
import type { Database } from './database.js';

type QueryClient = Database | postgres.TransactionSql;

interface TaskRow {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  created_by: ActorId;
  updated_by: ActorId;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

interface AuditRow {
  id: string;
  task_id: string;
  task_title: string;
  actor_id: ActorId;
  from_status: TaskStatus;
  to_status: TaskStatus;
  changed_at: Date;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: row.deleted_at?.toISOString() ?? null,
  };
}

export function createTaskRepository(sql: Database) {
  return {
    async actors(): Promise<Actor[]> {
      return sql<Actor[]>`select id, name from task_manager.actors order by name`;
    },

    async list(deleted: boolean): Promise<Task[]> {
      const rows = await sql<TaskRow[]>`
        select * from task_manager.tasks
        where (deleted_at is not null) = ${deleted}
        order by created_at desc, id desc
      `;
      return rows.map(toTask);
    },

    async create(input: CreateTaskInput): Promise<Task> {
      const [row] = await sql<TaskRow[]>`
        insert into task_manager.tasks (title, description, created_by, updated_by)
        values (${input.title}, ${input.description}, ${input.actorId}, ${input.actorId})
        returning *
      `;
      if (!row) throw new Error('Task insertion did not return a row.');
      return toTask(row);
    },

    async find(id: string, client: QueryClient, lock = false): Promise<Task | undefined> {
      const [row] = await client<TaskRow[]>`
        select * from task_manager.tasks where id = ${id}
        ${lock ? client`for update` : client``}
      `;
      return row ? toTask(row) : undefined;
    },

    async updateStatus(id: string, status: TaskStatus, actorId: ActorId, client: QueryClient) {
      const [row] = await client<TaskRow[]>`
        update task_manager.tasks set status = ${status}, updated_by = ${actorId}
        where id = ${id} returning *
      `;
      if (!row) throw new Error('Status update did not return a row.');
      return toTask(row);
    },

    async delete(id: string, actorId: ActorId, client: QueryClient) {
      const [row] = await client<TaskRow[]>`
        update task_manager.tasks set deleted_at = clock_timestamp(), updated_by = ${actorId}
        where id = ${id} returning *
      `;
      if (!row) throw new Error('Task deletion did not return a row.');
      return toTask(row);
    },

    async history(id: string, client: QueryClient): Promise<AuditLog[]> {
      const rows = await client<AuditRow[]>`
        select audit.id::text as id, task_id, task_title, actor_id, from_status, to_status, changed_at
        from task_manager.audit_logs as audit where task_id = ${id}
        order by audit.changed_at asc, audit.id asc
      `;
      return rows.map((row) => ({
        id: row.id,
        taskId: row.task_id,
        taskTitle: row.task_title,
        actorId: row.actor_id,
        fromStatus: row.from_status,
        toStatus: row.to_status,
        changedAt: row.changed_at.toISOString(),
      }));
    },
  };
}
