import { app } from './app.js';
import { database } from './database.js';
import { readEnvironment } from './environment.js';

const { PORT } = readEnvironment();
const server = app.listen(PORT, () => {
  console.info('Taskline API listening on http://localhost:' + PORT);
});

function shutdown() {
  server.close(() => {
    void database.end().then(() => process.exit(0));
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
