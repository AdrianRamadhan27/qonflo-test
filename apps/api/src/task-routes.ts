import { Router } from 'express';
import { z } from 'zod';
import type { ZodType } from 'zod';
import {
  changeStatusSchema,
  createTaskSchema,
  deleteTaskSchema,
  taskIdSchema,
} from '@taskline/shared';
import { database } from './database.js';
import { AppError } from './errors.js';
import { createTaskService } from './task-service.js';

function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(400, 'INVALID_INPUT', result.error.issues[0]?.message ?? 'Invalid request.');
  }
  return result.data;
}

// Validate supported filters; hosts can append their own routing query parameters.
const listQuerySchema = z.object({ deleted: z.enum(['true', 'false']).default('false') });
const service = createTaskService(database);
export const taskRoutes = Router();

taskRoutes.get('/actors', async (_request, response) => {
  response.json({ actors: await service.actors() });
});

taskRoutes.get('/tasks', async (request, response) => {
  const query = parseInput(listQuerySchema, request.query);
  response.json({ tasks: await service.list(query.deleted === 'true') });
});

taskRoutes.post('/tasks', async (request, response) => {
  const input = parseInput(createTaskSchema, request.body);
  response.status(201).json({ task: await service.create(input) });
});

taskRoutes.patch('/tasks/:id/status', async (request, response) => {
  const id = parseInput(taskIdSchema, request.params.id);
  const input = parseInput(changeStatusSchema, request.body);
  response.json(await service.changeStatus(id, input));
});

taskRoutes.delete('/tasks/:id', async (request, response) => {
  const id = parseInput(taskIdSchema, request.params.id);
  const input = parseInput(deleteTaskSchema, request.body);
  response.json({ task: await service.delete(id, input.actorId) });
});

taskRoutes.get('/tasks/:id/audit-logs', async (request, response) => {
  const id = parseInput(taskIdSchema, request.params.id);
  response.json(await service.history(id));
});
