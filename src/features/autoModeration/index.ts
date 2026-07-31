import { Client, Message, PermissionFlagsBits, RESTJSONErrorCodes } from 'discord.js';
import { logger } from '@logger/index.js';
import { REGEX_PATTERNS } from '@config/constants.js';

const INITIAL_RETRY_MS = 1000;
const MAX_RETRY_MS = 30 * 1000;
const MAX_DELETE_ATTEMPTS = 10;

export class AutoModerationFeature {
  private readonly client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  start(): void {
    this.client.on('messageCreate', (message) => void this.handleMessage(message));
    logger.info('Auto-moderation started', { context: 'AutoModeration' });
  }

  private async handleMessage(message: Message): Promise<void> {
    if (!message.guild) return;
    if (message.author.id === this.client.user?.id) return;

    const member = message.member;
    if (!member) return;
    if (
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.ManageMessages)
    ) {
      return;
    }

    if (!this.containsBlockedContent(message.content)) return;

    const deleted = await this.deleteWithRetry(message);
    if (deleted) {
      logger.info('Deleted message containing blocked content', {
        context: 'AutoModeration',
        userId: message.author.id,
        guildId: message.guild.id,
      });
    }
  }

  private containsBlockedContent(content: string): boolean {
    if (REGEX_PATTERNS.discordInvite.test(content)) return true;

    return content
      .split(/\s+/)
      .some((token) => REGEX_PATTERNS.email.test(this.stripPunctuation(token)));
  }

  private stripPunctuation(token: string): string {
    return token.replace(/^[^\w@.+%+-]+|[^\w@.+%+-]+$/g, '');
  }

  private async deleteWithRetry(message: Message): Promise<boolean> {
    let delay = INITIAL_RETRY_MS;

    for (let attempt = 1; attempt <= MAX_DELETE_ATTEMPTS; attempt++) {
      try {
        await message.delete();
        return true;
      } catch (error) {
        if ((error as { code?: unknown }).code === RESTJSONErrorCodes.UnknownMessage) {
          logger.debug('Message already deleted, skipping', { context: 'AutoModeration' });
          return true;
        }

        if (attempt < MAX_DELETE_ATTEMPTS) {
          logger.debug(`Delete attempt ${attempt} failed, retrying in ${delay}ms`, {
            context: 'AutoModeration',
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, MAX_RETRY_MS);
        } else {
          logger.warn('Gave up deleting message after max attempts', {
            context: 'AutoModeration',
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }
    }

    return false;
  }
}
