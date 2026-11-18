import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  APP_PASSWORD: z.string().optional().default(''),
  COOKIE_SECRET: z.string().min(16).default('dev-only-cookie-secret-change-me'),
  LOG_LEVEL: z.string().default('info'),
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;
