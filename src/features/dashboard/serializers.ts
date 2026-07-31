import type { Message, Guild, GuildBasedChannel, User } from 'discord.js';
import type { ApiMessage, ApiGuild, ApiChannel, ApiBotUser } from '@dtypes/dashboard';

export function serializeBotUser(user: User): ApiBotUser {
  return {
    id: user.id,
    username: user.username,
    globalName: user.globalName,
    avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
  };
}

export function serializeGuild(guild: Guild): ApiGuild {
  return {
    id: guild.id,
    name: guild.name,
    iconUrl: guild.iconURL({ extension: 'png', size: 256 }),
    memberCount: guild.memberCount,
    ownerId: guild.ownerId,
  };
}

export function serializeChannel(channel: GuildBasedChannel): ApiChannel {
  return {
    id: channel.id,
    guildId: channel.guildId,
    name: channel.name,
    type: channel.type,
    topic: 'topic' in channel ? channel.topic : null,
    position: 'position' in channel ? channel.position : 0,
    nsfw: 'nsfw' in channel ? channel.nsfw : false,
    parentId: 'parentId' in channel ? channel.parentId : null,
  };
}

export function serializeMessage(message: Message): ApiMessage {
  return {
    id: message.id,
    guildId: message.guildId ?? '',
    channelId: message.channelId,
    content: message.content,
    author: {
      id: message.author.id,
      username: message.author.username,
      globalName: message.author.globalName,
      displayName: message.member?.displayName ?? message.author.username,
      avatarUrl: message.author.displayAvatarURL({ extension: 'png', size: 128 }),
      bot: message.author.bot,
    },
    attachments: message.attachments.map((a) => ({
      url: a.url,
      name: a.name,
      contentType: a.contentType,
    })),
    embeds: message.embeds.map((e) => ({
      title: e.title ?? null,
      description: e.description ?? null,
      url: e.url ?? null,
      color: e.color ?? null,
      image: e.image
        ? { url: e.image.url, width: e.image.width ?? null, height: e.image.height ?? null }
        : null,
      thumbnail: e.thumbnail
        ? {
            url: e.thumbnail.url,
            width: e.thumbnail.width ?? null,
            height: e.thumbnail.height ?? null,
          }
        : null,
    })),
    createdTimestamp: message.createdTimestamp,
    editedTimestamp: message.editedTimestamp ?? null,
  };
}
