export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

export interface LoggerConfig {
  level: LogLevel;
  filePath: string;
  maxFiles: number;
  maxSize: string;
  debug: boolean;
}

export interface LogMetadata {
  context?: string;
  service?: string;
  userId?: string;
  guildId?: string;
  command?: string;
  executionTime?: number;
  error?: Error;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: LogMetadata;
}
