import express from 'express';
import { database } from './database.js';
import { AppError, handleError } from './errors.js';
import { taskRoutes } from './task-routes.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use('/api', (_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});
app.get('/api/health', async (_request, response) => {
  await database`select 1`;
  response.json({ status: 'ok' });
});
app.use('/api', taskRoutes);
app.use((_request, _response, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'This API route does not exist.'));
});
app.use(handleError);
