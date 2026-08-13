import { MessageFlags, TextChannel } from 'discord.js';
import type { Message, GuildTextBasedChannel } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getEnvironment } from '@config/environment.js';
import { BOT_INFO } from '@config/constants.js';
import type { BotClient } from '@bot/client.js';

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

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

function formatCpuUsage(): string {
  const usage = process.cpuUsage();
  const totalMs = (usage.user + usage.system) / 1000;
  const uptimeSec = process.uptime();
  if (uptimeSec === 0) return 'N/A';
  const percent = (totalMs / 1000 / uptimeSec) * 100;
  return `${percent.toFixed(2)}% (${(totalMs / 1000).toFixed(2)}s / ${uptimeSec.toFixed(0)}s)`;
}

function getCacheStats(client: BotClient): string[] {
  const lines: string[] = [];
  let totalMessages = 0;
  for (const channel of client.channels.cache.values()) {
    if (channel.isTextBased()) {
      totalMessages += (channel as GuildTextBasedChannel).messages.cache.size;
    }
  }
  lines.push(`Messages: ${totalMessages} cached`);
  lines.push(`Users: ${client.users.cache.size} / 5000 max`);
  let totalMembers = 0;
  for (const guild of client.guilds.cache.values()) {
    totalMembers += guild.members.cache.size;
  }
  lines.push(`Guild Members: ${totalMembers} total`);
  lines.push(`Presences: ${(client as any).presences?.cache?.size ?? 0} / 250 max`);
  lines.push(`Voice States: ${(client as any).voiceStates?.cache?.size ?? 0} / 250 max`);
  return lines;
}

const command: PrefixCommand = {
  name: 'stats',
  description: 'Show comprehensive bot statistics (system, Discord, dashboard, database)',
  category: 'utility',
  cooldown: 10,
  prefix: true,

  async execute(message: Message): Promise<void> {
    const client = message.client as BotClient;
    const env = getEnvironment();

    const mem = process.memoryUsage();
    const botLatency = Date.now() - message.createdTimestamp;
    const apiLatency = client.ws.ping;

    let totalMembers = 0;
    for (const guild of client.guilds.cache.values()) {
      totalMembers += guild.memberCount;
    }

    const dashboard = client.dashboard;
    const dashUptime = dashboard ? Date.now() - dashboard.startedAt : 0;
    const dashSocketCount = dashboard?.socketCount ?? 0;

    const dbPath = env.DATABASE_PATH;
    const dbSize =
      (await import('fs/promises').then((fs) => fs.stat(dbPath).catch(() => null)))?.size ?? 0;

    const statsId = crypto.randomUUID().slice(0, 8);
    const refreshId = `stats_refresh_${statsId}`;

    const container = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# ${BOT_INFO.name} v${BOT_INFO.version}\n**Comprehensive Statistics**`
            )
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder({
              media: { url: client.user?.displayAvatarURL({ size: 256 }) ?? '' },
            })
          )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🖥️ System & Process\n` +
          `**PID:** ${process.pid}\n` +
          `**Runtime:** Bun ${Bun.version}\n` +
          `**Platform:** ${process.platform} ${process.arch}\n` +
          `**Uptime:** ${formatUptime(process.uptime() * 1000)}\n` +
          `**CPU Usage:** ${formatCpuUsage()}\n` +
          `**Memory RSS:** ${formatBytes(mem.rss)}\n` +
          `**Heap Used:** ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}\n` +
          `**External:** ${formatBytes(mem.external)}`
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🤖 Discord Bot\n` +
          `**User:** ${client.user?.tag} (${client.user?.id})\n` +
          `**Gateway Ping:** ${apiLatency}ms\n` +
          `**Bot Latency:** ${botLatency}ms\n` +
          `**Guilds:** ${client.guilds.cache.size}\n` +
          `**Total Members:** ${totalMembers.toLocaleString()}\n` +
          `**Channels:** ${client.channels.cache.size}\n` +
          `**Shards:** ${client.ws.shards.size}`
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 📦 Cache Limits (Current / Max)\n` + getCacheStats(client).join('\n')
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 📊 Commands & Components\n` +
          `**Slash Commands:** ${client.commands.size}\n` +
          `**Prefix Commands:** ${client.prefixCommands.size}\n` +
          `**Context Commands:** ${client.contextCommands.size}\n` +
          `**Buttons:** ${client.buttons.size}\n` +
          `**Selects:** ${client.selects.size}\n` +
          `**Modals:** ${client.modals.size}`
      )
    );

    if (dashboard) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 🌐 Dashboard\n` +
            `**Status:** Running\n` +
            `**Host:** ${env.DASHBOARD_HOST}:${env.DASHBOARD_PORT}\n` +
            `**Uptime:** ${formatUptime(dashUptime)}\n` +
            `**WebSocket Connections:** ${dashSocketCount}\n` +
            `**Token:** ${env.DASHBOARD_TOKEN ? 'Configured' : 'Auto-generated (dev)'}`
        )
      );
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 💾 Database\n` +
          `**Path:** ${dbPath}\n` +
          `**Size:** ${dbSize > 0 ? formatBytes(dbSize) : 'Unknown'}\n` +
          `**Engine:** SQLite (WAL mode)`
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ⚙️ Configuration\n` +
          `**Prefix:** \`${env.BOT_PREFIX}\`\n` +
          `**Environment:** ${env.BOT_ENV}\n` +
          `**Debug:** ${env.BOT_DEBUG ? 'Yes' : 'No'}\n` +
          `**Presence:** ${env.PRESENCE_STATUS} (interval: ${env.PRESENCE_INTERVAL}s)`
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(refreshId)
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄')
    );

    container.addActionRowComponents(actionRow);

    await (message.channel as TextChannel).send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    client.buttons.set(refreshId, {
      id: refreshId,
      async execute(interaction) {
        if (interaction.user.id !== message.author.id) {
          await interaction.reply({
            content: 'Only the command author can refresh.',
            ephemeral: true,
          });
          return;
        }
        const newMsg = await (interaction.channel as TextChannel).send({
          content: 'Refreshing...',
        });
        const newLatency = Date.now() - newMsg.createdTimestamp;
        await newMsg.delete();
        await interaction.update({
          components: [
            new ContainerBuilder()
              .setAccentColor(0x5865f2)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `✅ Refreshed! New bot latency: ${newLatency}ms`
                )
              )
              .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
              ),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      },
    });

    setTimeout(() => {
      client.buttons.delete(refreshId);
    }, 300_000);
  },
};

export default command;
