import fs from 'fs';
import { createApp } from './app';
import { config } from './config';
import { prisma } from './db';
import { enqueueAllGeneration } from './services/resources/queue';
import { ensureStorageRootSync } from './services/resources/storage';

fs.mkdirSync(config.uploadDir, { recursive: true });
ensureStorageRootSync();

const app = createApp();

const server = app.listen(config.port, () => {
  console.log('');
  console.log(`  TechTuxAcademy API ready → ${config.apiUrl}`);
  console.log(`  Environment: ${config.env}`);
  console.log(`  Client URL:  ${config.clientUrl}`);
  console.log('');

  // Render's free plan has no persistent disk, so generated PDFs disappear on
  // redeploy/cold start. Re-queue any missing or outdated files in the
  // background; up-to-date files are skipped cheaply.
  if (config.autoGenerateResources) {
    enqueueAllGeneration({ force: false })
      .then((job) => console.log(`[resources] Startup generation queued (${job.id})`))
      .catch((error) => console.error('[resources] Could not queue startup generation:', error));
  }
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully…`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;
