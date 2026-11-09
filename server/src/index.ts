import fs from 'fs';
import { createApp } from './app';
import { config } from './config';
import { prisma } from './db';

fs.mkdirSync(config.uploadDir, { recursive: true });

const app = createApp();

const server = app.listen(config.port, () => {
  console.log('');
  console.log(`  TechTuxAcademy API ready → ${config.apiUrl}`);
  console.log(`  Environment: ${config.env}`);
  console.log(`  Client URL:  ${config.clientUrl}`);
  console.log('');
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
