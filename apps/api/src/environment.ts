import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: ['.env', '../../.env'], quiet: true });

const environmentSchema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_SSL_CA: z.string().optional(),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
});

export function readEnvironment() {
  const result = environmentSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error('Set DATABASE_URL, DATABASE_SSL, and PORT as described in .env.example.');
  }
  return result.data;
}

export function databaseSsl(environment: ReturnType<typeof readEnvironment>) {
  if (!environment.DATABASE_SSL) return false;
  return {
    rejectUnauthorized: true,
    ...(environment.DATABASE_SSL_CA ? { ca: environment.DATABASE_SSL_CA } : {}),
  };
}
