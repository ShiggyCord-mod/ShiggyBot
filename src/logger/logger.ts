import winston from 'winston';
import { createTransports } from './transports/index.js';
import type { LoggerConfig, LogMetadata } from '@dtypes/logger';
import { getEnvironment } from '@config/environment.js';

export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string, config?: Partial<LoggerConfig>) {
    this.context = context;

    const env = getEnvironment();
    const fullConfig: LoggerConfig = {
      level: config?.level || env.LOG_LEVEL,
      filePath: config?.filePath || env.LOG_FILE_PATH,
      maxFiles: config?.maxFiles || env.LOG_MAX_FILES,
      maxSize: config?.maxSize || env.LOG_MAX_SIZE,
      debug: config?.debug || env.BOT_DEBUG,
    };

    this.logger = winston.createLogger({
      level: fullConfig.level,
      defaultMeta: { service: 'shiggybot', context },
      transports: createTransports(fullConfig),
    });
  }

  private formatMetadata(metadata?: LogMetadata): object {
    return {
      context: this.context,
      ...metadata,
      timestamp: new Date().toISOString(),
    };
  }

  error(message: string, metadata?: LogMetadata): void {
    this.logger.error(message, this.formatMetadata(metadata));
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.logger.warn(message, this.formatMetadata(metadata));
  }

  info(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, this.formatMetadata(metadata));
  }

  http(message: string, metadata?: LogMetadata): void {
    this.logger.http(message, this.formatMetadata(metadata));
  }

  verbose(message: string, metadata?: LogMetadata): void {
    this.logger.verbose(message, this.formatMetadata(metadata));
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.logger.debug(message, this.formatMetadata(metadata));
  }

  silly(message: string, metadata?: LogMetadata): void {
    this.logger.silly(message, this.formatMetadata(metadata));
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }

  startTimer(): { done: (metadata?: LogMetadata) => void } {
    const start = Date.now();
    return {
      done: (metadata?: LogMetadata) => {
        const duration = Date.now() - start;
        this.info(`Operation completed in ${duration}ms`, {
          ...metadata,
          executionTime: duration,
        });
      },
    };
  }

  logCommand(command: string, userId: string, guildId?: string, success = true): void {
    this.info(`Command executed: ${command}`, {
      command,
      userId,
      guildId,
      success,
    });
  }

  logError(error: Error, context?: string): void {
    this.error(error.message, {
      error,
      stack: error.stack,
      context: context || this.context,
    });
  }
}
