import type { ErrorRequestHandler } from 'express';
import postgres from 'postgres';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

function describeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof SyntaxError) {
    return new AppError(400, 'INVALID_JSON', 'Send a valid JSON request body.');
  }
  if (typeof error === 'object' && error !== null && 'status' in error && error.status === 413) {
    return new AppError(413, 'BODY_TOO_LARGE', 'The request body is too large.');
  }
  if (error instanceof postgres.PostgresError && error.code === '23514') {
    return new AppError(409, 'INVALID_CHANGE', 'This change violates the task workflow.');
  }
  if (error instanceof postgres.PostgresError && ['55P03', '57014'].includes(error.code)) {
    return new AppError(503, 'TASK_BUSY', 'The task is busy. Refresh and try again.');
  }
  console.error('Unhandled API error:', error instanceof Error ? error.name : 'Unknown error');
  return new AppError(500, 'INTERNAL_ERROR', 'The request could not be completed. Try again.');
}

export const handleError: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  const failure = describeError(error);
  response.status(failure.status).json({
    error: { code: failure.code, message: failure.message },
  });
};
