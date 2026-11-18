import { createHash } from 'node:crypto';
import { Redis } from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: 2,
  enableOfflineQueue: true,
});

redis.on('error', () => {
  // Redis est un cache : en cas de panne, l'API continue sans lui (les erreurs sont gérées à l'usage).
});

const VERSION_KEY = 'cache:version';

/**
 * Lit une valeur en cache ou la calcule. La clé inclut un numéro de version global :
 * toute écriture appelle invalidate(), ce qui rend obsolètes d'un coup toutes les entrées.
 */
export async function cached<T>(
  name: string,
  params: unknown,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  let key: string | null = null;
  try {
    const version = (await redis.get(VERSION_KEY)) ?? '0';
    const hash = createHash('sha1')
      .update(JSON.stringify(params ?? null))
      .digest('hex')
      .slice(0, 16);
    key = `cache:v${version}:${name}:${hash}`;
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch {
    key = null;
  }
  const value = await compute();
  if (key) {
    redis.set(key, JSON.stringify(value), 'EX', ttlSeconds).catch(() => undefined);
  }
  return value;
}

export async function invalidate(): Promise<void> {
  try {
    await redis.incr(VERSION_KEY);
  } catch {
    // ignoré : sans Redis il n'y a rien à invalider
  }
}

/** Secondes restantes jusqu'au lundi 00:00 suivant (fin de la semaine ISO). */
export function secondsUntilNextMonday(now = new Date()): number {
  const next = new Date(now);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() + (8 - day));
  return Math.max(60, Math.round((next.getTime() - now.getTime()) / 1000));
}
