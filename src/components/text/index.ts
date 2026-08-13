import { TextDisplayBuilder } from 'discord.js';

export function TextDisplay(content: string): TextDisplayBuilder {
  return new TextDisplayBuilder().setContent(content);
}
