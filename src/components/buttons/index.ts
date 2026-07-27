import { ButtonBuilder, ButtonStyle } from 'discord.js';

export function PrimaryButton(customId: string, label: string, emoji?: string): ButtonBuilder {
  const button = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(ButtonStyle.Primary);

  if (emoji) {
    button.setEmoji(emoji);
  }

  return button;
}

export function SecondaryButton(customId: string, label: string, emoji?: string): ButtonBuilder {
  const button = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(ButtonStyle.Secondary);

  if (emoji) {
    button.setEmoji(emoji);
  }

  return button;
}

export function DangerButton(customId: string, label: string, emoji?: string): ButtonBuilder {
  const button = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(ButtonStyle.Danger);

  if (emoji) {
    button.setEmoji(emoji);
  }

  return button;
}

export function SuccessButton(customId: string, label: string, emoji?: string): ButtonBuilder {
  const button = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(ButtonStyle.Success);

  if (emoji) {
    button.setEmoji(emoji);
  }

  return button;
}

export function LinkButton(url: string, label: string, emoji?: string): ButtonBuilder {
  const button = new ButtonBuilder().setURL(url).setLabel(label).setStyle(ButtonStyle.Link);

  if (emoji) {
    button.setEmoji(emoji);
  }

  return button;
}
