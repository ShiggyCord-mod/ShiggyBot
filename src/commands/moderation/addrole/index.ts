import { MessageFlags, TextChannel, PermissionFlagsBits } from 'discord.js';
import type { Message } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot/index.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';
import { resolveUser, resolveRole } from '@utils/resolve/index.js';

const command: PrefixCommand = {
  name: 'addrole',
  description: 'Add a role to a user',
  category: 'moderation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],
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

    const roleArg = args.slice(offset).join(' ');
    const role = resolveRole(message.guild, roleArg);

    if (!role) {
      await sendError(message, 'Role not found.');
      return;
    }

    try {
      await user.roles.add(role);

      const container = new ContainerBuilder()
        .setAccentColor(0x00ff00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# \u{1f6e1}\ufe0f Role Added')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**User:** ${user}\n**Role:** ${role.name}\n**Moderator:** ${message.author.username}`
          )
        );

      await (message.channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {
      await sendError(message, 'Failed to add role. Check role hierarchy.');
    }
  },
};

async function sendUsage(message: Message): Promise<void> {
  const container = new ContainerBuilder()
    .setAccentColor(0xffa500)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '# \u{1f6e1}\ufe0f Add Role Command\n\nAdd a role to a server member\n\n## Usage\n`addrole <user> <role>`\n\n## Reply Usage\nReply to a message with `addrole <role>`\n\n## Example\n`addrole @user Member`'
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
