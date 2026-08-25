import type { Guild, GuildMember, Role, Message } from 'discord.js';

export function extractUserId(input: string): string | null {
  const mentionMatch = input.match(/^<@!?(\d+)>$/);
  if (mentionMatch) return mentionMatch[1];
  return /^\d{17,19}$/.test(input) ? input : null;
}

export async function resolveUser(guild: Guild, input: string): Promise<GuildMember | null> {
  const mentionMatch = input.match(/^<@!?(\d+)>$/);
  if (mentionMatch) {
    try {
      return await guild.members.fetch(mentionMatch[1]);
    } catch {
      return null;
    }
  }

  if (/^\d{17,19}$/.test(input)) {
    try {
      return await guild.members.fetch(input);
    } catch {
      return null;
    }
  }

  const lower = input.toLowerCase();
  const match = guild.members.cache.find(
    (m) =>
      m.user.username.toLowerCase() === lower ||
      m.displayName.toLowerCase() === lower ||
      m.nickname?.toLowerCase() === lower
  );

  return match ?? null;
}

export function resolveRole(guild: Guild, input: string): Role | null {
  const mentionMatch = input.match(/^<@&(\d+)>$/);
  if (mentionMatch) {
    return guild.roles.cache.get(mentionMatch[1]) ?? null;
  }

  if (/^\d{17,19}$/.test(input)) {
    return guild.roles.cache.get(input) ?? null;
  }

  const lower = input.toLowerCase();
  return (
    guild.roles.cache.find((r) => r.name.toLowerCase() === lower) ??
    guild.roles.cache.find((r) => r.name.toLowerCase().includes(lower)) ??
    null
  );
}

export async function resolveUserFromMessage(
  message: Message,
  input: string
): Promise<GuildMember | null> {
  if (message.reference?.messageId) {
    try {
      const replied = await message.channel.messages.fetch(message.reference.messageId);
      return message.guild?.members.cache.get(replied.author.id) ?? null;
    } catch {
      // fall through
    }
  }

  if (!message.guild) return null;
  return resolveUser(message.guild, input);
}

export function parseDuration(input: string): { ms: number; raw: string } | null {
  if (!input) return null;

  const match = input.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return { ms: value * (multipliers[unit] ?? 0), raw: input };
}
