import { Collection } from 'discord.js';
import type { Interaction } from 'discord.js';
import { logger } from '@logger/index.js';
import { database } from '@database/index.js';
import type { Event } from '@dtypes/bot';

const event: Event = {
  name: 'interactionCreate',
  once: false,

  async execute(...args: unknown[]): Promise<void> {
    const interaction = args[0] as Interaction;
    const startTime = Date.now();

    try {
      if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
      } else if (interaction.isContextMenuCommand()) {
        await handleContextCommand(interaction);
      } else if (interaction.isButton()) {
        await handleButton(interaction);
      } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction);
      } else if (interaction.isModalSubmit()) {
        await handleModal(interaction);
      } else if (interaction.isAutocomplete()) {
        await handleAutocomplete(interaction);
      }
    } catch (error) {
      logger.error('Error handling interaction', {
        error: error as Error,
        interactionType: interaction.type,
        userId: interaction.user.id,
      });

      const errorReply = {
        content: 'An error occurred while processing this interaction.',
        ephemeral: true,
      };

      try {
        if (interaction.isRepliable()) {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorReply);
          } else {
            await interaction.reply(errorReply);
          }
        }
      } catch (replyError) {
        logger.error('Failed to send error response', { error: replyError as Error });
      }
    }

    const executionTime = Date.now() - startTime;
    logger.debug(`Interaction processed in ${executionTime}ms`, {
      interactionType: interaction.type,
      userId: interaction.user.id,
    });
  },
};

async function handleSlashCommand(interaction: any): Promise<void> {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn(`Unknown command: ${interaction.commandName}`);
    return;
  }

  if (command.guildOnly && !interaction.guild) {
    await interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  if (command.ownerOnly) {
    const ownerIds = process.env.OWNER_IDS?.split(',') || [];
    if (!ownerIds.includes(interaction.user.id)) {
      await interaction.reply({
        content: 'This command can only be used by the bot owner.',
        ephemeral: true,
      });
      return;
    }
  }

  if (command.permissions && interaction.guild) {
    const missingPermissions = interaction.member.permissions.missing(command.permissions);
    if (missingPermissions.length > 0) {
      await interaction.reply({
        content: `You need the following permissions to use this command: ${missingPermissions.join(', ')}`,
        ephemeral: true,
      });
      return;
    }
  }

  if (command.botPermissions && interaction.guild) {
    const botPermissions = interaction.guild.members.me?.permissions;
    if (botPermissions) {
      const missingPermissions = botPermissions.missing(command.botPermissions);
      if (missingPermissions.length > 0) {
        await interaction.reply({
          content: `I need the following permissions to execute this command: ${missingPermissions.join(', ')}`,
          ephemeral: true,
        });
        return;
      }
    }
  }

  if (!interaction.client.cooldowns.has(interaction.commandName)) {
    interaction.client.cooldowns.set(interaction.commandName, new Collection());
  }

  const now = Date.now();
  const timestamps = interaction.client.cooldowns.get(interaction.commandName);
  const cooldownAmount = (command.cooldown || 3) * 1000;

  if (timestamps?.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      await interaction.reply({
        content: `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`,
        ephemeral: true,
      });
      return;
    }
  }

  timestamps?.set(interaction.user.id, now);
  setTimeout(() => timestamps?.delete(interaction.user.id), cooldownAmount);

  try {
    const timer = logger.startTimer();
    await command.execute(interaction);
    timer.done({
      command: command.name,
      userId: interaction.user.id,
      guildId: interaction.guild?.id,
    });

    database.logCommand({
      command: command.name,
      userId: interaction.user.id,
      guildId: interaction.guild?.id || null,
      channelId: interaction.channelId,
      success: true,
      executionTime: Date.now() - now,
      createdAt: new Date(),
    });
  } catch (error) {
    logger.error(`Error executing command ${command.name}`, { error: error as Error });
    throw error;
  }
}

async function handleContextCommand(interaction: any): Promise<void> {
  const command = interaction.client.contextCommands.get(interaction.commandName);
  if (!command) {
    logger.warn(`Unknown context command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
    logger.info(`Context command ${command.name} executed by ${interaction.user.id}`);
  } catch (error) {
    logger.error(`Error executing context command ${command.name}`, { error: error as Error });
    throw error;
  }
}

async function handleButton(interaction: any): Promise<void> {
  const button = interaction.client.buttons.get(interaction.customId);
  if (!button) {
    logger.warn(`Unknown button: ${interaction.customId}`);
    return;
  }

  try {
    await button.execute(interaction);
    logger.info(`Button ${interaction.customId} clicked by ${interaction.user.id}`);
  } catch (error) {
    logger.error(`Error handling button ${interaction.customId}`, { error: error as Error });
    throw error;
  }
}

async function handleSelectMenu(interaction: any): Promise<void> {
  const select = interaction.client.selects.get(interaction.customId);
  if (!select) {
    logger.warn(`Unknown select menu: ${interaction.customId}`);
    return;
  }

  try {
    await select.execute(interaction);
    logger.info(`Select menu ${interaction.customId} used by ${interaction.user.id}`);
  } catch (error) {
    logger.error(`Error handling select menu ${interaction.customId}`, { error: error as Error });
    throw error;
  }
}

async function handleModal(interaction: any): Promise<void> {
  const modal = interaction.client.modals.get(interaction.customId);
  if (!modal) {
    logger.warn(`Unknown modal: ${interaction.customId}`);
    return;
  }

  try {
    await modal.execute(interaction);
    logger.info(`Modal ${interaction.customId} submitted by ${interaction.user.id}`);
  } catch (error) {
    logger.error(`Error handling modal ${interaction.customId}`, { error: error as Error });
    throw error;
  }
}

async function handleAutocomplete(interaction: any): Promise<void> {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command?.autocomplete) {
    return;
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    logger.error(`Error handling autocomplete for ${interaction.commandName}`, {
      error: error as Error,
    });
  }
}

export default event;
