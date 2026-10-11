import postgres from 'postgres';
import { databaseSsl, readEnvironment } from './environment.js';

const environment = readEnvironment();

// One pool per warm process. Supabase's transaction pooler handles shared connections.
export const database = postgres(environment.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: databaseSsl(environment),
  connect_timeout: 10,
  idle_timeout: 20,
  connection: { application_name: 'taskline', statement_timeout: 8000 },
});

export type Database = typeof database;
