import { SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, ButtonBuilder } from 'discord.js';

export function Section(
  text: string,
  thumbnail?: ThumbnailBuilder,
  button?: ButtonBuilder
): SectionBuilder {
  const section = new SectionBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(text)
  );

  if (thumbnail) {
    section.setThumbnailAccessory(thumbnail);
  }

  if (button) {
    section.setButtonAccessory(button);
  }

  return section;
}

export function SectionWithThumbnail(text: string, thumbnail: ThumbnailBuilder): SectionBuilder {
  return new SectionBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
    .setThumbnailAccessory(thumbnail);
}

export function SectionWithButton(text: string, button: ButtonBuilder): SectionBuilder {
  return new SectionBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
    .setButtonAccessory(button);
}
