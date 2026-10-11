import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { databaseSsl, readEnvironment } from '../src/environment.js';

const environment = readEnvironment();
const adminUrl = process.env.ADMIN_DATABASE_URL;
if (!adminUrl) throw new Error('Set ADMIN_DATABASE_URL before running migrations.');

const sql = postgres(adminUrl, {
  max: 1,
  prepare: false,
  ssl: databaseSsl(environment),
  onnotice: () => {},
});
const directory = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));

try {
  await sql`create schema if not exists task_manager`;
  await sql`create table if not exists task_manager.schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default clock_timestamp()
  )`;

  const files = (await readdir(directory)).filter((filename) => filename.endsWith('.sql')).sort();
  for (const filename of files) {
    const applied =
      await sql`select filename from task_manager.schema_migrations where filename = ${filename}`;
    if (applied.length > 0) continue;
    const source = await readFile(directory + '/' + filename, 'utf8');
    await sql.begin(async (transaction) => {
      await transaction.unsafe(source);
      await transaction`insert into task_manager.schema_migrations (filename) values (${filename})`;
    });
    console.info('Applied migration:', filename);
  }

  const password = decodeURIComponent(new URL(environment.DATABASE_URL).password);
  if (!password) throw new Error('DATABASE_URL must contain the application role password.');
  // PostgreSQL quotes this secret as a literal for the non-parameterizable ALTER ROLE statement.
  const [roleChange] = await sql<{ statement: string }[]>`
    select format('alter role qonflo_app with password %L', ${password}::text) as statement
  `;
  if (!roleChange) throw new Error('Could not configure the application database role.');
  await sql.unsafe(roleChange.statement);
  console.info('Database ready. The API uses the restricted qonflo_app role.');
} finally {
  await sql.end();
}
