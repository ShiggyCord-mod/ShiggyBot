import { MessageFlags, TextChannel } from 'discord.js';
import type { Message, User } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot/index.js';
import { ContainerBuilder, TextDisplayBuilder } from 'discord.js';

const BASE_PNG_URL = 'https://cdn.kmmiio99o.dev/shiggycord/mpreg_base.png';
const OUTPUT_SIZE = 512;
const SVG_VIEWBOX = 36;
const HEAD_CX = 17;
const HEAD_CY = 8.3;
const HEAD_R = 8;

const cache = new Map<string, Buffer>();

async function resolveUser(input: string, message: Message): Promise<User | null> {
  if (message.mentions.users.size > 0) {
    return message.mentions.users.first()!;
  }

  if (/^\d{17,19}$/.test(input)) {
    try {
      return await message.client.users.fetch(input);
    } catch {
      return null;
    }
  }

  if (message.guild) {
    const match = message.guild.members.cache.find(
      (m) =>
        m.user.username.toLowerCase() === input.toLowerCase() ||
        m.displayName?.toLowerCase() === input.toLowerCase()
    );
    return match?.user ?? null;
  }

  return null;
}

async function generateMpregImage(avatarUrl: string): Promise<Buffer> {
  const { default: sharp } = await import('sharp');

  const baseRes = await fetch(BASE_PNG_URL);
  const baseBytes = Buffer.from(await baseRes.arrayBuffer());

  const avatarRes = await fetch(avatarUrl);
  const avatarBytes = Buffer.from(await avatarRes.arrayBuffer());

  const scale = OUTPUT_SIZE / SVG_VIEWBOX;
  const headX = HEAD_CX * scale;
  const headY = HEAD_CY * scale;
  const headRadius = HEAD_R * scale;
  const circleDiameter = Math.round(headRadius * 2);

  const croppedAvatar = await sharp(avatarBytes)
    .resize(circleDiameter, circleDiameter, { fit: 'cover' })
    .png()
    .toBuffer();

  const result = await sharp(baseBytes)
    .composite([
      {
        input: croppedAvatar,
        left: Math.round(headX - headRadius),
        top: Math.round(headY - headRadius),
      },
    ])
    .png()
    .toBuffer();

  return result;
}

const command: PrefixCommand = {
  name: 'mpreg',
  description: "Generate a pregnant man image with a user's avatar on the head",
  category: 'fun',
  cooldown: 10,
  prefix: true,

  async execute(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
      const container = new ContainerBuilder()
        .setAccentColor(0xe74c3c)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            '# Error\n\nUsage: `mpreg <username | userid | @mention>`'
          )
        );

      await (message.channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const target = await resolveUser(args[0], message);
    if (!target) {
      const container = new ContainerBuilder()
        .setAccentColor(0xe74c3c)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Error\n\nCould not find that user.')
        );

      await (message.channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });
    const cacheKey = `${target.id}:${avatarUrl}`;

    let imageBytes: Buffer;

    if (cache.has(cacheKey)) {
      imageBytes = cache.get(cacheKey)!;
    } else {
      try {
        imageBytes = await generateMpregImage(avatarUrl);
        cache.set(cacheKey, imageBytes);
        if (cache.size > 100) {
          const firstKey = cache.keys().next().value;
          if (firstKey) cache.delete(firstKey);
        }
      } catch {
        const container = new ContainerBuilder()
          .setAccentColor(0xe74c3c)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Error\n\nFailed to generate image.')
          );

        await (message.channel as TextChannel).send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
    }

    const fileName = `mpreg_${target.id}.png`;

    await (message.channel as TextChannel).send({
      files: [{ attachment: imageBytes, name: fileName }],
      components: [
        new ContainerBuilder()
          .setAccentColor(0xe91e63)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**${target.globalName ?? target.username}**\nRequested by ${message.author.globalName ?? message.author.username}`
            )
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
