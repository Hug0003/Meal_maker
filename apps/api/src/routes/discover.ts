import type { FastifyInstance } from 'fastify';
import { cached } from '../lib/cache';
import { discover } from '../lib/discover';

export async function discoverRoutes(app: FastifyInstance) {
  app.get('/api/discover', async () =>
    cached('discover', new Date().toISOString().slice(0, 10), 900, discover),
  );
}
