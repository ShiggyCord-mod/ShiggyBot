import type { BotClient } from '@bot/client.js';
import { database } from '@database/index.js';
import { logger } from '@logger/index.js';
import type { ApiChannel, ApiCommand, ApiGuild, ApiMessage, ApiStatus } from '@dtypes/dashboard';
import {
  serializeBotUser,
  serializeChannel,
  serializeGuild,
  serializeMessage,
} from './serializers.js';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function requireGuild(client: BotClient, guildId: string) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) throw new ApiError(404, 'Guild not found');
  return guild;
}

export function getStatus(client: BotClient, startedAt: number): ApiStatus {
  let members = 0;
  for (const guild of client.guilds.cache.values()) {
    members += guild.memberCount;
  }

  return {
    user: client.user ? serializeBotUser(client.user) : null,
    guilds: client.guilds.cache.size,
    channels: client.channels.cache.size,
    members,
    uptime: client.uptime ?? Date.now() - startedAt,
    ping: client.ws.ping,
    presence: client.user?.presence?.status ?? 'offline',
    dashboardUptime: Date.now() - startedAt,
  };
}

export function listGuilds(client: BotClient): ApiGuild[] {
  return client.guilds.cache
    .map((guild) => serializeGuild(guild))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getGuild(client: BotClient, guildId: string): ApiGuild {
  return serializeGuild(requireGuild(client, guildId));
}

export function listChannels(client: BotClient, guildId: string): ApiChannel[] {
  const guild = requireGuild(client, guildId);
  return guild.channels.cache
    .filter((channel) => channel.isTextBased())
    .map((channel) => serializeChannel(channel))
    .sort((a, b) => a.position - b.position);
}

export async function getMessages(
  client: BotClient,
  guildId: string,
  channelId: string,
  limit: number,
  before?: string
): Promise<ApiMessage[]> {
  const guild = requireGuild(client, guildId);
  const channel = guild.channels.cache.get(channelId);
  if (!channel?.isTextBased()) {
    throw new ApiError(404, 'Channel not found');
  }

  const messages = await channel.messages.fetch({
    limit: Math.min(limit, 100),
    ...(before ? { before } : {}),
  });
  return messages.map((message) => serializeMessage(message)).reverse();
}

export async function sendMessage(
  client: BotClient,
  guildId: string,
  channelId: string,
  content: string
): Promise<ApiMessage> {
  const guild = requireGuild(client, guildId);
  const channel = guild.channels.cache.get(channelId);
  if (!channel?.isTextBased()) {
    throw new ApiError(404, 'Channel not found');
  }
  if (!content.trim()) throw new ApiError(400, 'Content is required');
  if (content.length > 2000) throw new ApiError(400, 'Content exceeds 2000 characters');

  const sent = await channel.send(content);
  return serializeMessage(sent);
}

export function listCommands(client: BotClient, guildId: string): ApiCommand[] {
  requireGuild(client, guildId);

  const seen = new Map<string, ApiCommand>();
  for (const command of client.prefixCommands.values()) {
    if (!seen.has(command.name)) {
      seen.set(command.name, {
        name: command.name,
        description: command.description ?? '',
        category: command.category ?? 'general',
        aliases: command.aliases ?? [],
        disabled: database.isCommandDisabled(guildId, command.name),
      });
    }
  }

  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function setCommandDisabled(guildId: string, command: string, disabled: boolean): void {
  if (disabled) {
    database.disableCommand(guildId, command, 'dashboard');
  } else {
    database.enableCommand(guildId, command);
  }
  logger.info(`Command "${command}" ${disabled ? 'disabled' : 'enabled'} via dashboard`, {
    context: 'Dashboard',
    guildId,
  });
}
