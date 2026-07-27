import { MessageFlags, TextChannel } from 'discord.js';
import type { Message } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot/index.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';

const NOTES: Record<string, string> = {
  vc: 'No one can hear me\n\nDisable Advanced Voice Activity in Voice settings of Discord, and reload the app.',
  install:
    'Installation links\n\nShiggyCord: https://github.com/kmmiio99o/ShiggyCord\nShiggyManager: https://github.com/kmmiio99o/ShiggyManager\nShiggyXposed: https://github.com/kmmiio99o/ShiggyXposed',
  background:
    "Background in themes not showing\n\nDue to a recent Discord change, the themes chat background is currently broken for some users. The devs want to fix it but haven't been able to recreate the problem themselves yet.",
  ios: 'iOS Support\n\nDoes ShiggyCord support iOS? No, but you can run it as a custom bundle by KettuTweak.',
  passkeys:
    "Passkeys not working\n\nDue to the way ShiggyCord modifies the Discord app, it breaks the functionality of passkeys. To use passkeys, you must instead use ShiggyXposed, which doesn't alter the original app. Please note that ShiggyXposed requires a rooted device.",
  ftf: "Failed to fetch\n\nShiggyCord tried to fetch bundle but couldn't. Try using vpn and see if it works. But if Shiggy still load successfully, ignore it.",
  stuck:
    'ShiggyCord stuck on loading discord screen\n\nDisable bundle injection in Xposed Recovery Menu (shake your phone). If it fixes the issue, enable it again.',
};

const command: PrefixCommand = {
  name: 'note',
  description: 'Access saved notes and information',
  category: 'utility',
  cooldown: 3,
  prefix: true,

  async execute(message: Message, args: string[]): Promise<void> {
    if (args.length > 0 && NOTES[args[0].toLowerCase()]) {
      const raw = NOTES[args[0].toLowerCase()];
      const lines = raw.split('\n', 2);
      const title = lines[0];
      const description = lines.length > 1 ? lines[1] : '';

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
