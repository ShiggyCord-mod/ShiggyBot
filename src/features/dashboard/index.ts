import { existsSync } from 'fs';
import { randomBytes } from 'crypto';
import { join, resolve } from 'path';
import { spawn } from 'child_process';
import type { Message, PartialMessage } from 'discord.js';
import type { BotClient } from '@bot/client.js';
import { getEnvironment } from '@config/environment.js';
import { logger } from '@logger/index.js';
import type { DashboardOptions } from '@dtypes/dashboard';
import { createDashboardServer } from './server.js';
import { serializeMessage } from './serializers.js';
import { SubscriptionHub } from './ws.js';

export class DashboardFeature {
  private readonly client: BotClient;
  private readonly options: DashboardOptions;
  private readonly hub = new SubscriptionHub();
  public readonly startedAt: number;
  private server: ReturnType<typeof createDashboardServer> | null = null;

  constructor(client: BotClient, options: DashboardOptions) {
    this.client = client;
    this.options = options;
    this.startedAt = Date.now();
  }

  get socketCount(): number {
    return this.hub.socketCount;
  }

  start(): void {
    let token = this.options.token;

    if (!token) {
      if (getEnvironment().BOT_ENV !== 'development') {
        logger.info('Dashboard disabled (no DASHBOARD_TOKEN)', { context: 'Dashboard' });
        return;
      }

      token = randomBytes(24).toString('hex');
      logger.warn(`Dashboard enabled with generated dev token: ${token}`, {
        context: 'Dashboard',
      });
    }

    this.server = createDashboardServer(
      this.client,
      { ...this.options, token },
      this.hub,
      this.startedAt
    );
    this.client.on('messageCreate', (message) => this.onMessageCreate(message));
    this.client.on('messageDelete', (message) => this.onMessageDelete(message));

    logger.info(`Dashboard listening on :${this.options.port}`, { context: 'Dashboard' });

    void this.ensureWebBuild();
  }

  stop(): void {
    this.server?.stop(true);
    this.server = null;
  }

  private async ensureWebBuild(): Promise<void> {
    const webDir = resolve(this.options.webDir);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (existsSync(join(webDir, 'index.html'))) return;

    if (!getEnvironment().DASHBOARD_AUTO_BUILD) {
      logger.warn(
        `Dashboard UI not found at ${webDir}. The API is still served, but the web app ` +
          'will not be available. Build it with `bun install && bun run build` in web/ or ' +
          'set DASHBOARD_AUTO_BUILD=true to build automatically on startup.',
        { context: 'Dashboard' }
      );
      return;
    }

    const webRoot = resolve(webDir, '..');
    logger.warn(`Dashboard UI not found at ${webDir}, building...`, { context: 'Dashboard' });

    let exitCode = 0;

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!existsSync(join(webRoot, 'node_modules'))) {
      exitCode = await this.run(['install'], webRoot);
    }

    if (exitCode === 0) {
      exitCode = await this.run(['run', 'build'], webRoot);
    }

    if (exitCode === 0) {
      logger.info('Dashboard UI built successfully', { context: 'Dashboard' });
    } else {
      logger.warn(
        'Dashboard UI build failed — run `bun install && bun run build` inside the web/ directory',
        { context: 'Dashboard' }
      );
    }
  }

  private run(args: string[], cwd: string): Promise<number> {
    return new Promise((resolvePromise) => {
      const child = spawn('bun', args, { cwd, stdio: 'inherit' });
      child.on('error', () => resolvePromise(1));
      child.on('exit', (code) => resolvePromise(code ?? 1));
    });
  }

  private onMessageCreate(message: Message): void {
    try {
      if (!message.guildId) return;
      this.hub.broadcast(message.channelId, {
        type: 'messageCreate',
        data: serializeMessage(message),
      });
    } catch (error) {
      logger.warn('Failed to broadcast messageCreate', {
        context: 'Dashboard',
        error: error as Error,
      });
    }
  }

  private onMessageDelete(message: Message | PartialMessage): void {
    try {
      if (!message.guildId) return;
      this.hub.broadcast(message.channelId, {
        type: 'messageDelete',
        data: { id: message.id, channelId: message.channelId, guildId: message.guildId },
      });
    } catch (error) {
      logger.warn('Failed to broadcast messageDelete', {
        context: 'Dashboard',
        error: error as Error,
      });
    }
  }
}
