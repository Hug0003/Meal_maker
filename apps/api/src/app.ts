import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { redis } from './lib/cache';
import { prisma } from './lib/db';
import { env } from './lib/env';
import { HttpError } from './lib/recipes';
import { authRoutes, requireAuth } from './routes/auth';
import { discoverRoutes } from './routes/discover';
import { fridgeRoutes } from './routes/fridge';
import { metaRoutes } from './routes/meta';
import { planRoutes } from './routes/plan';
import { recipeRoutes } from './routes/recipes';
import { shoppingRoutes } from './routes/shopping';

export async function buildApp(opts: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger === false ? false : { level: env.LOG_LEVEL },
    trustProxy: true,
    bodyLimit: 256 * 1024,
  });

  await app.register(cookie, { secret: env.COOKIE_SECRET });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    redis: env.NODE_ENV === 'test' ? undefined : redis,
    skipOnError: true,
    allowList: (req) => req.url === '/api/health',
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({ error: 'Données invalides', details: err.flatten() });
    }
    if (err instanceof HttpError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) req.log.error(err);
    const message = err instanceof Error ? err.message : 'Erreur';
    return reply.status(status).send({ error: status >= 500 ? 'Erreur interne' : message });
  });

  app.get('/api/health', async (_req, reply) => {
    const checks = { db: false, redis: false };
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.db = true;
    } catch {
      /* rapporté ci-dessous */
    }
    try {
      checks.redis = (await redis.ping()) === 'PONG';
    } catch {
      /* rapporté ci-dessous */
    }
    const ok = checks.db && checks.redis;
    return reply.status(ok ? 200 : 503).send({ status: ok ? 'ok' : 'degraded', ...checks });
  });

  await app.register(authRoutes);
  await app.register(async (api) => {
    api.addHook('onRequest', requireAuth);
    await api.register(metaRoutes);
    await api.register(recipeRoutes);
    await api.register(fridgeRoutes);
    await api.register(discoverRoutes);
    await api.register(planRoutes);
    await api.register(shoppingRoutes);
  });

  app.setNotFoundHandler((_req, reply) => reply.status(404).send({ error: 'Introuvable' }));
  return app;
}
