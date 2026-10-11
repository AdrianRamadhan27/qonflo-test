import { NEXT_STATUS, STATUS_LABELS } from '@taskline/shared';
import type { ActorId, ChangeStatusInput, CreateTaskInput, Task } from '@taskline/shared';
import type { Database } from './database.js';
import { AppError } from './errors.js';
import { createTaskRepository } from './task-repository.js';

function requireTask(task: Task | undefined): Task {
  if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'This task could not be found.');
  return task;
}

export function createTaskService(sql: Database) {
  const repository = createTaskRepository(sql);

  return {
    actors: () => repository.actors(),
    list: (deleted: boolean) => repository.list(deleted),
    create: (input: CreateTaskInput) => repository.create(input),

    async changeStatus(id: string, input: ChangeStatusInput) {
      return sql.begin(async (transaction) => {
        const task = requireTask(await repository.find(id, transaction, true));
        if (task.deletedAt) {
          throw new AppError(
            404,
            'TASK_DELETED',
            'This task was deleted. Its history is still available.',
          );
        }
        if (task.status === input.status) return { task, changed: false };

        const nextStatus = NEXT_STATUS[task.status];
        if (nextStatus !== input.status) {
          const message = nextStatus
            ? 'The next status must be ' + STATUS_LABELS[nextStatus] + '.'
            : 'This task is done and cannot advance further.';
          throw new AppError(409, 'INVALID_TRANSITION', message);
        }

        const updated = await repository.updateStatus(id, input.status, input.actorId, transaction);
        return { task: updated, changed: true };
      });
    },

    async delete(id: string, actorId: ActorId) {
      return sql.begin(async (transaction) => {
        const task = requireTask(await repository.find(id, transaction, true));
        if (task.deletedAt) return task;
        return repository.delete(id, actorId, transaction);
      });
    },

    async history(id: string) {
      // Both reads use one snapshot, so the task cannot disagree with its returned history.
      return sql.begin('isolation level repeatable read', async (transaction) => {
        const task = requireTask(await repository.find(id, transaction));
        const logs = await repository.history(id, transaction);
        return { task, logs };
      });
    },
  };
}
