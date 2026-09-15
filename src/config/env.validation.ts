import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  API_BASE_PATH: z.string().default('/api/v1'),
  ENGINE_MAX_RETRIES: z.coerce.number().int().min(1).max(20).default(3),
  ENGINE_TIMEOUT_MS: z.coerce.number().int().min(100).max(60000).default(4000),
});

export type Env = z.infer<typeof EnvSchema>;

export function validate(config: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}
