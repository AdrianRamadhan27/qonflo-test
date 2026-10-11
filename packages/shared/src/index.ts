import { z } from 'zod';

export const TASK_STATUSES = ['to_do', 'pending', 'in_progress', 'done'] as const;
export const ACTOR_IDS = ['john.doe', 'jane.smith', 'alex.chen'] as const;

export const STATUS_LABELS = {
  to_do: 'To do',
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
} satisfies Record<TaskStatus, string>;

export const NEXT_STATUS = {
  to_do: 'pending',
  pending: 'in_progress',
  in_progress: 'done',
  done: null,
} satisfies Record<TaskStatus, TaskStatus | null>;

export const statusSchema = z.enum(TASK_STATUSES);
export const actorIdSchema = z.enum(ACTOR_IDS);
export const taskIdSchema = z.uuid();

export const actorSchema = z.object({
  id: actorIdSchema,
  name: z.string(),
});

export const createTaskSchema = z.strictObject({
  title: z.string().trim().min(1, 'Enter a task title.').max(120),
  description: z.string().trim().max(2000).default(''),
  actorId: actorIdSchema,
});

export const changeStatusSchema = z.strictObject({
  status: statusSchema,
  actorId: actorIdSchema,
});

export const deleteTaskSchema = z.strictObject({
  actorId: actorIdSchema,
});

export const taskSchema = z.object({
  id: taskIdSchema,
  title: z.string(),
  description: z.string(),
  status: statusSchema,
  createdBy: actorIdSchema,
  updatedBy: actorIdSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});

export const auditLogSchema = z.object({
  id: z.string().regex(/^\d+$/),
  taskId: taskIdSchema,
  taskTitle: z.string(),
  actorId: actorIdSchema,
  fromStatus: statusSchema,
  toStatus: statusSchema,
  changedAt: z.iso.datetime(),
});

export const actorsResponseSchema = z.object({ actors: z.array(actorSchema) });
export const tasksResponseSchema = z.object({ tasks: z.array(taskSchema) });
export const taskResponseSchema = z.object({ task: taskSchema });
export const changeStatusResponseSchema = z.object({ task: taskSchema, changed: z.boolean() });
export const historyResponseSchema = z.object({
  task: taskSchema,
  logs: z.array(auditLogSchema),
});
export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export type TaskStatus = z.infer<typeof statusSchema>;
export type ActorId = z.infer<typeof actorIdSchema>;
export type Actor = z.infer<typeof actorSchema>;
export type Task = z.infer<typeof taskSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;
export type TaskHistory = z.infer<typeof historyResponseSchema>;
