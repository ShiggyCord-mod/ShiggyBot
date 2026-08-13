import { MessageFlags, TextChannel } from 'discord.js';
import type { Message } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';

import notesJson from './notes.json';

type Note = { title: string; description: string };

const NOTES: Record<string, Note> = Object.fromEntries(
  Object.entries(notesJson as Record<string, Note>).map(([k, v]) => [k.toLowerCase(), v])
);

const command: PrefixCommand = {
  name: 'note',
  description: 'Access saved notes and information',
  category: 'utility',
  cooldown: 3,
  prefix: true,

  async execute(message: Message, args: string[]): Promise<void> {
    if (args.length > 0 && NOTES[args[0].toLowerCase()]) {
      const note = NOTES[args[0].toLowerCase()];
      const title = note.title || '';
      const description = note.description || '';

      const container = new ContainerBuilder()
        .setAccentColor(0x1e90ff)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${title}`))
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));

      if (message.reference?.messageId) {
        try {
          await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        } catch {
          // fall through
        }
      }

      await (message.channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const keys = Object.keys(NOTES).join(', ');
    const container = new ContainerBuilder()
      .setAccentColor(0x1e90ff)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Available Notes'))
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Use \`note <name>\` to view a note\n\n${keys}`)
      );

    await (message.channel as TextChannel).send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
export default command;
