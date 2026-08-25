# ShiggyBot

Discord bot — TypeScript, Node.js, discord.js v14, Bun, SQLite.

## Build & run

```bash
bun run dev                      # dev mode with hot reload
bun run build                    # compile TypeScript → dist/
bun run start                    # run compiled bot
bun run validate                 # lint + typecheck + format:check (runs on pre-commit)
```

**Strict mode** — TypeScript strict=true, ESLint rules enforce prefer-const, no-var, eqeqeq, no-explicit-any (warn). Build includes security checks (detect-non-literal-fs-filename, object-injection are warnings). Prettier auto-formats on commit via husky.

## Config

### Loading order (later overrides earlier)

1. `.env` file (optional, gitignored — loaded by dotenv)
2. Environment variables

**Validation**: All env vars validated at startup via Zod schema in `src/config/environment.ts`. If validation fails, bot exits with code 1.

### Expected keys

| Key | Required | Default | Notes |
|-----|----------|---------|-------|
| `DISCORD_TOKEN` | Yes | — | Bot token for Discord auth |
| `DISCORD_CLIENT_ID` | Yes | — | Bot client ID from Developer Portal |
| `BOT_PREFIX` | No | `!` | Command prefix |
| `BOT_ENV` | No | `development` | development, production, test |
| `BOT_DEBUG` | No | `false` | Enables debug logging |
| `PRESENCE_STATUS` | No | `idle` | online, idle, dnd, invisible |
| `PRESENCE_INTERVAL` | No | `5` | Status update interval (seconds) |
| `GITHUB_TOKEN` | No | — | GitHub API token (optional) |
| `GITHUB_REPO` | No | `kmmiio99o/ShiggyCord` | GitHub repo for features |
| `DATABASE_PATH` | No | `./data/database.db` | SQLite database path |
| `DASHBOARD_TOKEN` | No | — | Dashboard auth token (optional) |
| `DASHBOARD_HOST` | No | `127.0.0.1` | Dashboard bind address |
| `DASHBOARD_PORT` | No | `3000` | Dashboard port |
| `LOG_LEVEL` | No | `info` | error, warn, info, http, verbose, debug, silly |
| `LOG_FILE_PATH` | No | `./logs` | Winston log directory |

## Architecture

- **`src/index.ts`** — Entry point, error handlers (SIGINT, SIGTERM, uncaughtException, unhandledRejection)
- **`src/bot/client.ts`** — BotClient extends discord.js Client; initializes handlers, commands, events, features
- **`src/handlers/`** — CommandHandler (auto-discovers `src/commands/**/index.ts`), EventHandler, ComponentHandler
- **`src/commands/`** — Organized by category (utility, moderation, search, fun, core); auto-loaded by CommandHandler
- **`src/features/`** — Runtime features (autoModeration, dashboard, presence); initialized in client startup
- **`src/config/`** — Environment validation (Zod), constants

### Gateway intents

```typescript
GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages | GatewayIntentBits.GuildMembers | 
GatewayIntentBits.GuildVoiceStates | GatewayIntentBits.DirectMessages | GatewayIntentBits.MessageContent
```

Add/remove intents in `src/bot/client.ts` BotClient constructor if features need different access.

## Commands

Default prefix: `!`. Commands are case-insensitive. Auto-discovered from `src/commands/**/index.ts`.

| Command | Category | Notes |
|---------|----------|-------|
| `!help` | utility | Interactive help with select menu; lists all commands by category |
| `!note <key>` | utility | Load structured notes from `src/commands/utility/note/notes.json` |
| `!stats` | utility | Bot stats (uptime, ping, message count) |
| `!ban <user> [duration] [reason]` | moderation | Timed bans; reply-to support; persists to DB; accepts mention/name/ID (bans non-members by ID) |
| `!kick <user> [reason]` | moderation | Kick user; reply-to support |
| `!timeout <user> [duration]` | moderation | Timeout (mute) user; reply-to support |
| `!purge <count>` | moderation | Delete 1–100 messages; 14-day Discord API limit |
| `!nuke confirm` | moderation | Clone channel, delete original; Admin only |
| `!addrole / !removerole` | moderation | Add/remove role from user; reply-to support |
| `!disable / !enable <command>` | core | Per-guild command toggle; ManageGuild required; persists to DB |
| `!setwelcome <role>` | core | Set autorole; use `disable`/`none`/`off` to disable |
| `!google <query>` | search | Generate Google search link; aliases: `g`, `search` |
| `!plugin <name>` | search | Search plugin index (60-min cache); Levenshtein distance matching |
| `!mpreg` | fun | Avatar compositing with ImageSharp; LRU cache (100 items) |

## Extending

- **New prefix command**: Create `src/commands/category/name/index.ts`. Implement `PrefixCommand` interface. Export as `default`. CommandHandler auto-discovers on reload.
- **New event**: Create `src/bot/events/eventname/index.ts`. Export handler function `(client: BotClient) => void`. EventHandler wires it.
- **New feature**: Create class under `src/features/`. Initialize in `src/bot/client.ts` before login.
- **New data**: Initialize SQLite schema in feature/service startup. Database path from `getEnvironment().DATABASE_PATH`.

## Key patterns & gotchas

- **Auto-discovery** — CommandHandler uses glob + dynamic imports. File name must be `index.ts` in command subdirectory.
- **Logging** — Always use logger from `@logger/index.js`, never console. Winston rotates daily and by 20MB size.
- **Environment access** — Import `getEnvironment()` from `@config/environment.js`. Cached on first call.
- **Path aliases** — tsconfig.json defines `@config/*`, `@commands/*`, `@handlers/*`, `@logger/*`, `@dtypes/*`, `@utils/*`, `@bot/*`, `@features/*`, `@components/*`
- **ESM imports** — Dynamic imports and relative imports use `.js` extension (Bun ESM requirement)
- **Error handling** — Uncaught exceptions exit with code 1. SIGINT/SIGTERM gracefully shutdown and destroy client.
- **Discord.js v14** — MessageContent intent required for `message.content`. Components use IsComponentsV2 flag for V2 container/section/text builders.
- **Husky pre-commit** — Runs eslint --fix + prettier --write on staged TypeScript files
- **Tests** — Bun's built-in test runner. Tests in `tests/unit/` and `tests/integration/` (run with `bun test`)

## Git

- Gitignored: `.env`, `data/`, `dist/`, `logs/`, `node_modules/`
- Never commit `DISCORD_TOKEN` or other secrets
- Branch model: `dev` (development), `main` (releases)
- Pre-commit hook validates code style via husky + lint-staged
