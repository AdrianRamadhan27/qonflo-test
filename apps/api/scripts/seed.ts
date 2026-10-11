import postgres from 'postgres';
import { databaseSsl, readEnvironment } from '../src/environment.js';

const environment = readEnvironment();
const sql = postgres(environment.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: databaseSsl(environment),
});

try {
  const existing = await sql`select id from task_manager.tasks limit 1`;
  if (existing.length > 0) {
    console.info('Example data skipped: the database already contains tasks.');
  } else {
    await sql.begin(async (transaction) => {
      const examples = [
        {
          title: 'Prepare the October invoices',
          description: 'Confirm the totals with finance before sending.',
          actor: 'john.doe',
          status: 'in_progress',
        },
        {
          title: 'Review the onboarding checklist',
          description: 'Check the steps for our next teammate.',
          actor: 'jane.smith',
          status: 'pending',
        },
        {
          title: 'Share the weekly project update',
          description: 'Summarize decisions and the next actions.',
          actor: 'alex.chen',
          status: 'to_do',
        },
        {
          title: 'Publish the release notes',
          description: 'Document what changed in the latest release.',
          actor: 'jane.smith',
          status: 'done',
        },
      ];
      for (const example of examples) {
        const [task] = await transaction<{ id: string }[]>`
          insert into task_manager.tasks (title, description, created_by, updated_by)
          values (${example.title}, ${example.description}, ${example.actor}, ${example.actor})
          returning id
        `;
        if (!task) throw new Error('Could not create an example task.');
        const stages = ['pending', 'in_progress', 'done'];
        for (const status of stages) {
          if (example.status === 'to_do') break;
          await transaction`update task_manager.tasks set status = ${status}, updated_by = 'alex.chen' where id = ${task.id}`;
          if (status === example.status) break;
        }
      }
    });
    console.info('Created four example tasks using the normal audit triggers.');
  }
} finally {
  await sql.end();
}
