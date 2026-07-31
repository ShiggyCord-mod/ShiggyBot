import { MessageFlags, TextChannel } from 'discord.js';
import type { Message } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

const command: PrefixCommand = {
  name: 'ping',
  description: 'Check bot latency and API response time',
  category: 'general',
  cooldown: 5,
  prefix: true,

  async execute(message: Message): Promise<void> {
    const sent = await (message.channel as TextChannel).send({ content: 'Pinging...' });
    const botLatency = sent.createdTimestamp - message.createdTimestamp;
    const apiLatency = message.client.ws.ping;

    const container = new ContainerBuilder()
      .setAccentColor(0x00ff00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Bot Latency:** ${botLatency}ms`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**API Latency:** ${apiLatency}ms`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Uptime:** ${formatUptime(message.client.uptime ?? 0)}`
        )
      );

    await sent.edit({
      content: null,
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
