import { MessageFlags, TextChannel } from 'discord.js';
import type { Message } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot/index.js';
import type { MpregResult } from '@dtypes/image/index.js';
import { AccentContainer, ErrorContainer, SingleImage } from '@components/index.js';
import { generateMpregImage } from '@utils/image/index.js';
import { resolveUserFromMessage } from '@utils/resolve/index.js';

const cache = new Map<string, MpregResult>();

const command: PrefixCommand = {
  name: 'mpreg',
  description: "Generate a pregnant man image with a user's avatar on the head",
  category: 'fun',
  cooldown: 10,
  prefix: true,

  async execute(message: Message, args: string[]): Promise<void> {
    const target = await resolveUserFromMessage(message, args[0] ?? '');
    if (!target) {
      const detail =
        args.length === 0
          ? 'Usage: `mpreg <username | userid | @mention>`\n\nReply to a message with `mpreg` to use that user.'
          : 'Could not find that user.';

      await (message.channel as TextChannel).send({
        components: [ErrorContainer('Error', detail)],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const user = target.user;
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
    const cacheKey = `${user.id}:${avatarUrl}`;

    let result: MpregResult;

    if (cache.has(cacheKey)) {
      result = cache.get(cacheKey)!;
    } else {
      try {
        result = await generateMpregImage(avatarUrl);
        cache.set(cacheKey, result);
        if (cache.size > 100) {
          const firstKey = cache.keys().next().value;
          if (firstKey) cache.delete(firstKey);
        }
      } catch {
        await (message.channel as TextChannel).send({
          components: [ErrorContainer('Error', 'Failed to generate image.')],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
    }

    const fileName = `mpreg_${user.id}.png`;

    const container = AccentContainer(
      user.globalName ?? user.username,
      `Requested by ${message.author.globalName ?? message.author.username}`,
      result.dominantColor
    ).addMediaGalleryComponents(SingleImage(`attachment://${fileName}`));

    await (message.channel as TextChannel).send({
      files: [{ attachment: result.buffer, name: fileName }],
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
