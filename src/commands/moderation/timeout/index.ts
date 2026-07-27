import { MessageFlags, TextChannel, PermissionFlagsBits } from 'discord.js';
import type { Message } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot/index.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
} from 'discord.js';
import { resolveUser, parseDuration } from '@utils/resolve/index.js';

const command: PrefixCommand = {
  name: 'timeout',
  description: 'Timeout a user for a specified duration',
  category: 'moderation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  prefix: true,

  async execute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;

    let user = message.reference?.messageId
      ? (await message.channel.messages.fetch(message.reference.messageId)).member
      : null;

    const offset = user ? 0 : 1;

    if (args.length < offset + 1) {
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

    const durationArg = args[offset];
    const reason =
      args.length > offset + 1 ? args.slice(offset + 1).join(' ') : 'No reason provided';

    const parsed = parseDuration(durationArg);
    const durationMs = parsed?.ms ?? 5 * 60 * 1000;

    try {
      await user.timeout(durationMs, reason);

      const avatarUrl = user.user.displayAvatarURL();
      const durationMinutes = Math.round(durationMs / 60000);

      const container = new ContainerBuilder()
        .setAccentColor(0xffa500)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('# \u{1f6e1}\ufe0f User Timed Out')
            )
            .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: avatarUrl } }))
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**User:** ${user}\n**Moderator:** ${message.author.username}\n**Duration:** ${durationMinutes} minute(s)\n**Reason:** ${reason}`
          )
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('*Timeout action completed*')
        );

      await (message.channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {
      await sendError(message, 'Failed to timeout user. Check role hierarchy.');
    }
  },
};

async function sendUsage(message: Message): Promise<void> {
  const container = new ContainerBuilder()
    .setAccentColor(0xffa500)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '# \u{1f6e1}\ufe0f Timeout Command\n\nTemporarily mute a user from chatting\n\n## Usage\n`timeout <user> <duration> [reason]`\n\n## Reply Usage\nReply to a message with `timeout <duration> [reason]`\n\n## Duration Format\n\u{1f552} s = seconds, m = minutes, h = hours, d = days\n\n## Example\n`timeout @user 10m Breaking rules`'
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
