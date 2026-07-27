export type EnvironmentMode = 'development' | 'production' | 'test';

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

export interface EnvironmentConfig {
  DISCORD_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET?: string;
  DISCORD_GUILD_ID?: string;
  BOT_PREFIX: string;
  BOT_ENV: EnvironmentMode;
  BOT_DEBUG: boolean;
  DATABASE_PATH: string;
  DATABASE_URL?: string;
  LOG_LEVEL: LogLevel;
  LOG_FILE_PATH: string;
  LOG_MAX_FILES: number;
  LOG_MAX_SIZE: string;
  API_KEY?: string;
  IMAGE_QUALITY: number;
  IMAGE_MAX_SIZE: number;
}

export type EnvVariable = keyof EnvironmentConfig;

export interface EnvValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}
