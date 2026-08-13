import { MessageFlags, TextChannel, PermissionFlagsBits } from 'discord.js';
import type { Message } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
} from 'discord.js';
import { resolveUser, parseDuration } from '@utils/resolve';
import { database } from '@database/index.js';
import { logger } from '@logger/index.js';

const PURGE_DAYS = 7;

const command: PrefixCommand = {
  name: 'ban',
  description: 'Ban a user from the server (supports timed bans)',
  category: 'moderation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  prefix: true,

  async execute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;

    let user = message.reference?.messageId
      ? (await message.channel.messages.fetch(message.reference.messageId)).member
      : null;

    const offset = user ? 0 : 1;

    if (args.length < offset) {
      await sendUsage(message);
      return;
    }

    if (offset === 1) {
      user = await resolveUser(message.guild, args[0]);
    }

    if (!user) {
      await sendError(message, 'User not found.');
      return;
    }

    let rawDuration: string | null = null;
    let durationMs: number | null = null;
    let reasonStart = offset;

    if (args.length > offset) {
      const parsed = parseDuration(args[offset]);
      if (parsed) {
        rawDuration = parsed.raw;
        durationMs = parsed.ms;
        reasonStart = offset + 1;
      }
    }

    const reason =
      args.length > reasonStart ? args.slice(reasonStart).join(' ') : 'No reason provided';

    try {
      await user.ban({ deleteMessageSeconds: PURGE_DAYS * 24 * 60 * 60, reason });

      if (durationMs !== null) {
        const unbanAt = new Date(Date.now() + durationMs);
        try {
          database.createTimedBan(message.guild.id, user.id, unbanAt, message.author.id, reason);
        } catch (dbError) {
          // scheduling failed — attempt rollback (unban) to avoid indefinite ban
          try {
            await message.guild?.members.unban(
              user.id,
              'Failed to schedule timed ban, rolling back'
            );

            // rollback succeeded
            {
              const container = new ContainerBuilder()
                .setAccentColor(0xffa500)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `# \u{1f6a8} Timed Ban Scheduling Failed (Rolled back)\n\n` +
                      `**User:** <@${user.id}> (${user.id})\n` +
                      `**Moderator:** ${message.author.tag}\n` +
                      `**Reason:** ${reason}\n\n` +
                      `The ban was applied but scheduling the unban failed. The user has been unbanned to avoid an indefinite ban. Please try again.`
                  )
                );

              await (message.channel as TextChannel).send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
              });
            }

            return;
          } catch (unbanErr) {
            // rollback failed; surface error to moderator and log
            logger.error('Failed to schedule timed ban and rollback unban failed', {
              error: dbError as Error,
              rollbackError: unbanErr as Error,
              guildId: message.guild?.id,
              userId: user.id,
            });

            // rollback failed
            {
              const container = new ContainerBuilder()
                .setAccentColor(0xe74c3c)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `# \u{1f6a8} Timed Ban Scheduling Failed\n\n` +
                      `**User:** <@${user.id}> (${user.id})\n` +
                      `**Moderator:** ${message.author.tag}\n` +
                      `**Guild:** ${message.guild?.id}\n` +
                      `**Reason:** ${reason}\n\n` +
                      `Timed ban scheduling failed and rollback unban also failed. The user may remain banned. Please contact an administrator to investigate.`
                  )
                );

              await (message.channel as TextChannel).send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
              });
            }

            return;
          }
        }
      }

      const avatarUrl = user.user.displayAvatarURL();

      const container = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('# \u{1f6e1}\ufe0f User Banned')
            )
            .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: avatarUrl } }))
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**User:** ${user}\n**Moderator:** ${message.author.username}\n**Reason:** ${reason}${rawDuration ? `\n**Duration:** ${rawDuration}` : ''}`
          )
        );

      await (message.channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {
      await sendError(message, 'Failed to ban user. Check role hierarchy.');
    }
  },
};

async function sendUsage(message: Message): Promise<void> {
  const container = new ContainerBuilder()
    .setAccentColor(0xffa500)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '# \u{1f6e1}\ufe0f Ban Command\n\nBan a user from the server\n\n## Usage\n`ban <user> [duration] [reason]`\n\n## Reply Usage\nReply to a message with `ban [duration] [reason]`\n\n## Duration Format\n\u{1f552} s = seconds, m = minutes, h = hours, d = days (optional)\n\n## Example\n`ban @user 7d Breaking rules`'
      )
    );

  await (message.channel as TextChannel).send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function sendError(message: Message, error: string): Promise<void> {
  const container = new ContainerBuilder()
    .setAccentColor(0xe74c3c)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Error\n\n${error}`));

  await (message.channel as TextChannel).send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

export default command;
