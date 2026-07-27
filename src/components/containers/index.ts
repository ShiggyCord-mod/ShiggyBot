import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';

export function SuccessContainer(title: string, description: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0x00ff00)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ **${title}**`))
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
}

export function ErrorContainer(title: string, description: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **${title}**`))
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
}

export function WarningContainer(title: string, description: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xffff00)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`⚠️ **${title}**`))
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
}

export function InfoContainer(title: string, description: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0x00ffff)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`ℹ️ **${title}**`))
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
}
