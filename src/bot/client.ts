import { Client, GatewayIntentBits, Partials, Routes, ActivityType, Options } from 'discord.js';
import { Collection } from '@discordjs/collection';
import { REST } from '@discordjs/rest';
import type { Snowflake, GuildMember, User, Presence, VoiceState } from 'discord.js';
import { getEnvironment } from '@config/environment.js';
import { logger } from '@logger/index.js';
import type {
  SlashCommand,
  PrefixCommand,
  ContextCommand,
  ButtonCommand,
  SelectCommand,
  ModalCommand,
} from '@dtypes/bot';
import { CommandHandler, EventHandler, ComponentHandler } from '@handlers/index.js';

export class BotClient extends Client {
  public commands: Collection<string, SlashCommand> = new Collection();
  public prefixCommands: Collection<string, PrefixCommand> = new Collection();
  public contextCommands: Collection<string, ContextCommand> = new Collection();
  public buttons: Collection<string, ButtonCommand> = new Collection();
  public selects: Collection<string, SelectCommand> = new Collection();
  public modals: Collection<string, ModalCommand> = new Collection();
  public cooldowns: Collection<Snowflake, Collection<string, number>> = new Collection();

  private commandHandler: CommandHandler;
  private eventHandler: EventHandler;
  private componentHandler: ComponentHandler;

  constructor() {
    let self: BotClient | null = null;

    const clientOptions: any = {
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User],
      rest: { version: '10' },
      presence: {
        status: 'idle',
        activities: [
          {
            name: 'b help',
            type: ActivityType.Watching,
          },
        ],
      },
      makeCache: Options.cacheWithLimits({
        MessageManager: 200,
        ReactionManager: 50,
        GuildMemberManager: {
          maxSize: 250,
          keepOverLimit: (member: GuildMember) => member.id === self?.user?.id,
        },
        UserManager: {
          maxSize: 5000,
          keepOverLimit: (user: User) => user.id === self?.user?.id,
        },
        PresenceManager: 250,
        VoiceStateManager: 250,
      }),
      sweepers: {
        ...Options.DefaultSweeperSettings,
        messages: { interval: 300, lifetime: 600 },
        guildMembers: {
          interval: 3600,
          filter: (member: GuildMember) => member.id !== self?.user?.id,
        },
        users: { interval: 3600, filter: (user: User) => user.id !== self?.user?.id },
        presences: {
          interval: 3600,
          filter: (presence: Presence) => presence.userId !== self?.user?.id,
        },
        voiceStates: {
          interval: 3600,
          filter: (voiceState: VoiceState) => voiceState.id !== self?.user?.id,
        },
      },
    };

    super(clientOptions);

    self = this; // eslint-disable-line @typescript-eslint/no-this-alias

    this.commandHandler = new CommandHandler(this);
    this.eventHandler = new EventHandler(this);
    this.componentHandler = new ComponentHandler(this);
  }

  async start(): Promise<void> {
    const env = getEnvironment();

    logger.info('Starting bot...', { context: 'BotClient' });

    try {
      logger.info('Database initialized', { context: 'BotClient' });

      await this.commandHandler.loadCommands();
      logger.info('Commands loaded', { context: 'BotClient' });

      await this.eventHandler.loadEvents();
      logger.info('Events loaded', { context: 'BotClient' });

      await this.componentHandler.loadComponents();
      logger.info('Components loaded', { context: 'BotClient' });

      await this.login(env.DISCORD_TOKEN);
      logger.info('Bot logged in', { context: 'BotClient' });
    } catch (error) {
      logger.error('Failed to start bot', { context: 'BotClient', error: error as Error });
      process.exit(1);
    }
  }

  async deployCommands(): Promise<void> {
    const env = getEnvironment();
    const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

    try {
      logger.info('Deploying commands...', { context: 'BotClient' });

      const slashCommands = this.commands.map((cmd) => ({
        name: cmd.name,
        description: cmd.description,
        options: [],
      }));

      const contextCommands = this.contextCommands.map((cmd) => ({
        name: cmd.name,
        type: cmd.type === 'message' ? 3 : 2,
      }));

      const allCommands = [...slashCommands, ...contextCommands];

      if (env.DISCORD_GUILD_ID) {
        await rest.put(
          Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
          {
            body: allCommands,
          }
        );
        logger.info('Commands deployed to guild', {
          context: 'BotClient',
          guildId: env.DISCORD_GUILD_ID,
        });
      } else {
        await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
          body: allCommands,
        });
        logger.info('Commands deployed globally', { context: 'BotClient' });
      }
    } catch (error) {
      logger.error('Failed to deploy commands', { context: 'BotClient', error: error as Error });
    }
  }
}
