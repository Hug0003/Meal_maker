import { timingSafeEqual } from 'node:crypto';
import type { AuthStatusDto } from '@meal/shared';
import { loginSchema } from '@meal/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../lib/env';

const COOKIE = 'mm_session';
const MAX_AGE = 60 * 60 * 24 * 90; // 90 jours

function isAuthenticated(req: FastifyRequest): boolean {
  if (!env.APP_PASSWORD) return true;
  const raw = req.cookies[COOKIE];
  if (!raw) return false;
  const res = req.unsignCookie(raw);
  return res.valid && res.value === 'ok';
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  if (!isAuthenticated(req)) {
    return reply.status(401).send({ error: 'Mot de passe requis' });
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.get('/api/auth/status', async (req): Promise<AuthStatusDto> => ({
    required: !!env.APP_PASSWORD,
    authenticated: isAuthenticated(req),
  }));

  app.post(
    '/api/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (req, reply) => {
      const { password } = loginSchema.parse(req.body);
      if (!env.APP_PASSWORD || !safeEqual(password, env.APP_PASSWORD)) {
        return reply.status(401).send({ error: 'Mot de passe incorrect' });
      }
      reply.setCookie(COOKIE, 'ok', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: req.protocol === 'https',
        signed: true,
        maxAge: MAX_AGE,
      });
      return { ok: true };
    },
  );

  app.post('/api/auth/logout', async (_req, reply) => {
    reply.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  });
}
