import type { ZodType } from 'zod';
import {
  actorsResponseSchema,
  apiErrorSchema,
  changeStatusResponseSchema,
  historyResponseSchema,
  taskResponseSchema,
  tasksResponseSchema,
} from '@taskline/shared';
import type { ActorId, ChangeStatusInput, CreateTaskInput } from '@taskline/shared';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, schema: ZodType<T>, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api' + path, {
      ...options,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      'NETWORK_ERROR',
      'Cannot reach the server. Check your connection and try again.',
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = apiErrorSchema.safeParse(body);
    throw failure.success
      ? new ApiError(failure.data.error.code, failure.data.error.message)
      : new ApiError('SERVER_ERROR', 'The server could not complete the request. Try again.');
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(
      'INVALID_RESPONSE',
      'The server returned an unexpected response. Refresh and try again.',
    );
  }
  return result.data;
}

export const taskApi = {
  actors: (signal: AbortSignal) => request('/actors', actorsResponseSchema, { signal }),
  list: (deleted: boolean, signal: AbortSignal) =>
    request('/tasks?deleted=' + deleted, tasksResponseSchema, { signal }),
  create: (input: CreateTaskInput) =>
    request('/tasks', taskResponseSchema, { method: 'POST', body: JSON.stringify(input) }),
  changeStatus: ({ id, input }: { id: string; input: ChangeStatusInput }) =>
    request('/tasks/' + id + '/status', changeStatusResponseSchema, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  delete: ({ id, actorId }: { id: string; actorId: ActorId }) =>
    request('/tasks/' + id, taskResponseSchema, {
      method: 'DELETE',
      body: JSON.stringify({ actorId }),
    }),
  history: (id: string, signal: AbortSignal) =>
    request('/tasks/' + id + '/audit-logs', historyResponseSchema, { signal }),
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.';
}
