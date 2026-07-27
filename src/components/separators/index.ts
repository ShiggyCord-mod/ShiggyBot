import { SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';

export function PrimarySeparator(): SeparatorBuilder {
  return new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
}

export function SecondarySeparator(): SeparatorBuilder {
  return new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small);
}

export function SmallSeparator(): SeparatorBuilder {
  return new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
}

export function LargeSeparator(): SeparatorBuilder {
  return new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
}
