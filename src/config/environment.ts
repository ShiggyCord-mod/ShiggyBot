import { z } from 'zod';
import { config } from 'dotenv';

config();

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'Discord token is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'Discord client ID is required'),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),

  BOT_PREFIX: z.string().default('!'),
  BOT_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BOT_DEBUG: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),

  PRESENCE_STATUS: z.enum(['online', 'idle', 'dnd', 'invisible']).default('idle'),
  PRESENCE_INTERVAL: z.coerce.number().min(1).default(5),

  GITHUB_REPO: z.string().default('kmmiio99o/ShiggyCord'),
  GITHUB_TOKEN: z.string().optional(),

  DATABASE_PATH: z.string().default('./data/database.db'),
  DATABASE_URL: z.string().optional(),

  DASHBOARD_TOKEN: z.string().optional(),
  DASHBOARD_HOST: z.string().default('127.0.0.1'),
  DASHBOARD_PORT: z.coerce.number().min(1).max(65535).default(3000),
  DASHBOARD_WEB_DIR: z.string().default('./web/dist'),
  DASHBOARD_AUTO_BUILD: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  LOG_FILE_PATH: z.string().default('./logs'),
  LOG_MAX_FILES: z.coerce.number().default(30),
  LOG_MAX_SIZE: z.string().default('20m'),

  IMAGE_QUALITY: z.coerce.number().min(1).max(100).default(80),
  IMAGE_MAX_SIZE: z.coerce.number().default(5000000),
});

export type Environment = z.infer<typeof envSchema>;

let environment: Environment | null = null;

export function getEnvironment(): Environment {
  if (!environment) {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
      // eslint-disable-next-line no-console
      console.error('❌ Invalid environment variables:');
      // eslint-disable-next-line no-console
      console.error(result.error.flatten().fieldErrors);
      process.exit(1);
    }

    environment = result.data;
  }

  return environment;
}

export function isDevelopment(): boolean {
  return getEnvironment().BOT_ENV === 'development';
}

export function isProduction(): boolean {
  return getEnvironment().BOT_ENV === 'production';
}

export function isTest(): boolean {
  return getEnvironment().BOT_ENV === 'test';
}
