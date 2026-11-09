/**
 * Local development PostgreSQL helper.
 *
 *   npm run db:start   → initialise + start a real PostgreSQL cluster on port 5433
 *   npm run db:stop    → stop the cluster
 *
 * This is only a convenience for environments without a system PostgreSQL.
 * In production (or if you already have Postgres) set DATABASE_URL and ignore this.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(serverRoot, '.env') });

const port = Number(process.env.EMBEDDED_PG_PORT || 5433);
const user = process.env.EMBEDDED_PG_USER || 'postgres';
const password = process.env.EMBEDDED_PG_PASSWORD || 'postgres';
const database = process.env.EMBEDDED_PG_DATABASE || 'techtuxacademy';
const databaseDir = path.join(serverRoot, '.pgdata');
const pidFile = path.join(databaseDir, 'postmaster.pid');
const action = process.argv[2] || 'start';

function readPid() {
  try {
    return Number(fs.readFileSync(pidFile, 'utf8').split('\n')[0]);
  } catch {
    return null;
  }
}

if (action === 'stop') {
  const pid = readPid();
  if (!pid) {
    console.log('No embedded PostgreSQL instance is running.');
    process.exit(0);
  }
  try {
    process.kill(pid, 'SIGINT');
    console.log(`Stopped embedded PostgreSQL (pid ${pid}).`);
  } catch (error) {
    console.error('Could not stop PostgreSQL:', error.message);
  }
  process.exit(0);
}

const { default: EmbeddedPostgres } = await import('embedded-postgres');

const pg = new EmbeddedPostgres({
  databaseDir,
  port,
  user,
  password,
  persistent: true,
  onLog: (message) => {
    if (/ready to accept connections|database system is shut down/i.test(message)) {
      console.log(message.trim());
    }
  },
});

const alreadyInitialised = fs.existsSync(path.join(databaseDir, 'PG_VERSION'));
if (!alreadyInitialised) {
  console.log('Initialising embedded PostgreSQL cluster…');
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase(database);
  console.log(`Created database "${database}".`);
} catch (error) {
  if (!String(error.message).includes('already exists')) {
    console.log(`Database "${database}" already present or could not be created (${error.message}).`);
  }
}

console.log('');
console.log(`  Embedded PostgreSQL is running on localhost:${port}`);
console.log(`  DATABASE_URL=postgresql://${user}:${password}@localhost:${port}/${database}?schema=public`);
console.log('  Press Ctrl+C to stop.');
console.log('');

// Keep the process (and database) alive.
setInterval(() => {}, 1 << 30);
