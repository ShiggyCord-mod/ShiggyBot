import { MessageFlags, TextChannel } from 'discord.js';
import type { Message } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot/index.js';
import { searchPlugin } from './services/searchService.js';
import {
  buildPluginContainer,
  buildErrorContainer,
  buildNotFoundContainer,
  addActionButtons,
  buildInstallReplyContainer,
  buildSourceReplyContainer,
} from './components/ui.js';

const command: PrefixCommand = {
  name: 'plugin',
  description: 'Search for Discord client plugins',
  category: 'search',
  aliases: ['plugins', 'plg', 'plug'],
  cooldown: 5,
  prefix: true,

  async execute(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
      const container = buildErrorContainer(
        'Please provide a plugin name to search.\n\n## Usage\n`plugin <name>`'
      );
      await (message.channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const query = args.join(' ');
    let result: Awaited<ReturnType<typeof searchPlugin>>;

    try {
      result = await searchPlugin({ query });
    } catch {
      const container = buildErrorContainer('Search failed. Please try again later.');
      await (message.channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    if (!result) {
      const container = buildNotFoundContainer(query);
      await (message.channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const container = buildPluginContainer(result, query);

    const installId = `plugin_install_${result.data.name.replace(/\s+/g, '_')}`;
    const sourceId = `plugin_source_${result.data.name.replace(/\s+/g, '_')}`;
    const installUrl = result.data.installUrl;
    const sourceUrl = result.data.sourceUrl;
    const pluginName = result.data.name;

    const client = message.client as any;
    if (!client.buttons) client.buttons = new Map();

    client.buttons.set(installId, {
      id: installId,
      execute: async (interaction: any) => {
        const replyContainer = buildInstallReplyContainer(pluginName, installUrl);
        await interaction.reply({
          components: [replyContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      },
    });

    client.buttons.set(sourceId, {
      id: sourceId,
      execute: async (interaction: any) => {
        const replyContainer = buildSourceReplyContainer(pluginName, sourceUrl);
        await interaction.reply({
          components: [replyContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      },
    });

    addActionButtons(container, installId, sourceId);

    await (message.channel as TextChannel).send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
