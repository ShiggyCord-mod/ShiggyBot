import type { TextChannel } from 'discord.js';

export interface PendingNuke {
  channelId: string;
  guildId: string;
  authorId: string;
  reason: string;
}

const pendingNukes = new Map<string, PendingNuke>();
const TTL_MS = 5 * 60_000;

function scheduleExpiry(messageId: string, entry: PendingNuke): void {
  setTimeout(() => {
    if (pendingNukes.get(messageId) === entry) pendingNukes.delete(messageId);
  }, TTL_MS);
}

export function registerPendingNuke(messageId: string, entry: PendingNuke): void {
  pendingNukes.set(messageId, entry);
  scheduleExpiry(messageId, entry);
}

export function getPendingNuke(messageId: string): PendingNuke | null {
  return pendingNukes.get(messageId) ?? null;
}

export function takePendingNuke(messageId: string): PendingNuke | null {
  const entry = pendingNukes.get(messageId);
  if (entry) pendingNukes.delete(messageId);
  return entry ?? null;
}

export async function nukeChannel(
  channel: TextChannel,
  reason: string,
  moderator: string
): Promise<TextChannel> {
  const auditReason = `Nuked by ${moderator}: ${reason}`;
  const cloned = await channel.clone({ name: channel.name, reason: auditReason });
  await channel.delete(auditReason);
  return cloned;
}
