import { ActionRowBuilder, ButtonBuilder } from 'discord.js';

export function ActionRow(...buttons: ButtonBuilder[]): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);
}
