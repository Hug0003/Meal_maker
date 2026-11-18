import { buildApp } from './app';
import { redis } from './lib/cache';
import { prisma } from './lib/db';
import { env } from './lib/env';

const app = await buildApp();

const shutdown = async (signal: string) => {
  app.log.info(`${signal} reçu, arrêt en cours`);
  await app.close();
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ port: env.PORT, host: env.HOST });
