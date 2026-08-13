import {
  Collection,
  MessageFlags,
  TextChannel,
  ContainerBuilder,
  TextDisplayBuilder,
} from 'discord.js';
import type { Message, PermissionResolvable } from 'discord.js';
import { logger } from '@logger/index.js';
import { database } from '@database/index.js';
import type { Event, PrefixCommand } from '@dtypes/bot';
import { getEnvironment } from '@config/environment.js';

const event: Event = {
  name: 'messageCreate',
  once: false,

  async execute(...args: unknown[]): Promise<void> {
    const message = args[0] as Message;
    if (message.author.bot) return;
    if (!message.guild) return;

    const env = getEnvironment();
    const prefix = env.BOT_PREFIX;
    const content = message.content;

    logger.debug(`Message received: "${content}" | prefix: "${prefix}"`, {
      context: 'messageCreate',
    });

    if (!content.toLowerCase().startsWith(prefix.toLowerCase())) return;

    const argsList = content.slice(prefix.length).trim().split(/\s+/);
    const commandName = argsList.shift()?.toLowerCase();
    if (!commandName) return;

    const client = message.client as any;
    const command: PrefixCommand | undefined = client.prefixCommands.get(commandName);
    if (!command) {
      logger.debug(`No prefix command found for "${commandName}"`, { context: 'messageCreate' });
      return;
    }

    logger.debug(`Found prefix command: ${command.name}`, { context: 'messageCreate' });

    const startTime = Date.now();

    try {
      if (command.guildOnly && !message.guild) {
        const container = new ContainerBuilder()
          .setAccentColor(0xe74c3c)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              '# Error\n\nThis command can only be used in a server.'
            )
          );
        await (message.channel as TextChannel).send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      if (command.ownerOnly) {
        const app = await client.application?.fetch();
        if (app?.owner?.id !== message.author.id) {
          const container = new ContainerBuilder()
            .setAccentColor(0xe74c3c)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                '# Error\n\nThis command can only be used by the bot owner.'
              )
            );
          await (message.channel as TextChannel).send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      if (command.devOnly) {
        const ownerIds = process.env.OWNER_IDS?.split(',') ?? [];
        if (!ownerIds.includes(message.author.id)) {
          const container = new ContainerBuilder()
            .setAccentColor(0xe74c3c)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('# Error\n\nThis command is for developers only.')
            );
          await (message.channel as TextChannel).send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      if (database.isCommandDisabled(message.guild.id, command.name)) {
        logger.debug(`Command ${command.name} is disabled in this guild`, {
          context: 'messageCreate',
        });
        return;
      }

      if (command.permissions && command.permissions.length > 0) {
        const missing = (command.permissions as PermissionResolvable[]).filter(
          (perm) => !message.member?.permissions.has(perm)
        );
        if (missing.length > 0) {
          const container = new ContainerBuilder()
            .setAccentColor(0xe74c3c)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# Error\n\nYou need the following permissions: ${missing.join(', ')}`
              )
            );
          await (message.channel as TextChannel).send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      if (command.botPermissions && command.botPermissions.length > 0) {
        const botPerms = message.guild.members.me?.permissions;
        if (botPerms) {
          const missing = (command.botPermissions as PermissionResolvable[]).filter(
            (perm) => !botPerms.has(perm)
          );
          if (missing.length > 0) {
            const container = new ContainerBuilder()
              .setAccentColor(0xe74c3c)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# Error\n\nI need the following permissions: ${missing.join(', ')}`
                )
              );
            await (message.channel as TextChannel).send({
              components: [container],
              flags: MessageFlags.IsComponentsV2,
            });
            return;
          }
        }
      }

      const cooldownKey = command.name;
      if (!client.cooldowns.has(cooldownKey)) {
        client.cooldowns.set(cooldownKey, new Collection());
      }
      const timestamps = client.cooldowns.get(cooldownKey);
      const cooldownAmount = (command.cooldown || 3) * 1000;

      if (timestamps?.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id)! + cooldownAmount;
        if (Date.now() < expirationTime) {
          const timeLeft = (expirationTime - Date.now()) / 1000;
          const cooldownContainer = new ContainerBuilder()
            .setAccentColor(0xf1c40f)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# Wait!\nPlease wait **${timeLeft.toFixed(1)}s** before reusing \`${command.name}\`.`
              )
            );
          await (message.channel as TextChannel).send({
            components: [cooldownContainer],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      timestamps?.set(message.author.id, Date.now());
      setTimeout(() => timestamps?.delete(message.author.id), cooldownAmount);

      logger.debug(`Executing prefix command: ${command.name}`, { context: 'messageCreate' });
      await command.execute(message, argsList, client);
      logger.debug(`Finished prefix command: ${command.name}`, { context: 'messageCreate' });

      const executionTime = Date.now() - startTime;
      logger.debug(`Prefix command ${command.name} executed`, {
        userId: message.author.id,
        guildId: message.guild.id,
        executionTime,
      });
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : undefined;
      logger.error(`Error executing prefix command ${command.name}: ${errMessage}`, {
        context: 'messageCreate',
        stack: errStack,
        userId: message.author.id,
        guildId: message.guild?.id,
      });

      try {
        const errorContainer = new ContainerBuilder()
          .setAccentColor(0xe74c3c)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              '# Error\n\nAn error occurred while executing this command.'
            )
          );
        await (message.channel as TextChannel).send({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      } catch {
        // swallow reply errors
      }
    }
  },
};

export default event;
