import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import type { LoggerConfig } from '@dtypes/logger';
import { mkdirSync } from 'fs';

const { combine, timestamp, printf, colorize } = winston.format;

const MAX_CONTEXT_LEN = 14;

function stringifyExtra(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v instanceof Error) return v.stack ?? v.message;
    if (typeof v === 'object' && v !== null) {
      if (seen.has(v)) return '[circular]';
      seen.add(v);
    }
    return v;
  });
}

function createConsoleFormat() {
  return combine(
    colorize(),
    timestamp({ format: 'HH:mm:ss.SSS' }),
    printf(
      ({ level, message, timestamp: ts, context, service: _svc, timestamp: _metaTs, ...rest }) => {
        const ctx = (context as string | undefined) ?? '';
        const paddedCtx =
          ctx.length > 0 ? ctx.padEnd(MAX_CONTEXT_LEN) : ' '.repeat(MAX_CONTEXT_LEN);
        const extra = Object.keys(rest).length > 0 ? ` ${stringifyExtra(rest)}` : '';
        return `${ts} ${level.padEnd(5)} ${paddedCtx} ${message}${extra}`;
      }
    )
  );
}

function createFileFormat() {
  return combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), winston.format.json());
}

export function createFileTransport(config: LoggerConfig): DailyRotateFile {
  mkdirSync(config.filePath, { recursive: true });

  return new DailyRotateFile({
    filename: `${config.filePath}/bot-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: config.maxSize,
    maxFiles: config.maxFiles,
    format: createFileFormat(),
  });
}

export function createConsoleTransport(config: LoggerConfig): winston.transport {
  return new winston.transports.Console({
    level: config.debug ? 'debug' : 'info',
    format: createConsoleFormat(),
  });
}

export function createErrorTransport(config: LoggerConfig): DailyRotateFile {
  mkdirSync(config.filePath, { recursive: true });

  return new DailyRotateFile({
    filename: `${config.filePath}/error-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: config.maxSize,
    maxFiles: config.maxFiles,
    level: 'error',
    format: createFileFormat(),
  });
}

export function createTransports(config: LoggerConfig) {
  return [
    createConsoleTransport(config),
    createFileTransport(config),
    createErrorTransport(config),
  ];
}
