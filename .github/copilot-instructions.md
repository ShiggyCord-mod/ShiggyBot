# ShiggyBot Copilot Instructions

TypeScript/Node.js Discord bot (v2.0.0) using discord.js 14, Bun, and ESNext. Previously a C# .NET project — AGENTS.md is outdated.

## Quick Commands

```bash
bun run dev          # Run in dev mode with hot reload
bun run build        # Compile TypeScript to dist/
bun run start        # Run compiled bot
bun run lint         # Check code style (ESLint + Security rules)
bun run lint:fix     # Auto-fix ESLint issues
bun run typecheck    # Type check without emitting
bun run format       # Prettier format
bun run validate     # lint + typecheck + format:check (runs before commit)
bun test             # Run all tests (if tests exist)
```

## Architecture

### Core Structure
- **`src/index.ts`** — Entry point, sets up event handlers (SIGINT, SIGTERM, unhandledRejection, uncaughtException)
- **`src/bot/client.ts`** — BotClient extends discord.js Client; loads handlers, commands, events, components
- **`src/handlers/`** — CommandHandler (loads command files), EventHandler, ComponentHandler (buttons, selects, modals)
- **`src/commands/`** — Organized by category (utility, moderation, search, fun, core); each command exports default PrefixCommand
- **`src/features/`** — Runtime plugins (autoModeration, dashboard, presence)
- **`src/config/`** — Environment validation with Zod; loaded from `.env` (uses dotenv)

### Key Modules
| Module | Purpose |
|--------|---------|
| discord.js v14 | Embeds, interactions, collectors, gateway intents |
| @discordjs/rest | REST API interaction (slash commands, webhooks) |
| Zod | Environment schema validation |
| Winston | Structured logging to console + rotating file logs |
| tsyringe | Dependency injection (if used by features) |
| React 19 | UI components in dashboard (web/) |

### Command Loading
Commands are auto-discovered: CommandHandler scans `src/commands/**/index.ts` files, checks for `prefix: true` property, and registers to `client.prefixCommands` collection by name (case-insensitive matching).

Commands can have `aliases` (PrefixCommand interface). Prefix defaults to `!`, configurable via `BOT_PREFIX` env var.

### Event Handling
Events (ready, messageCreate, interactionCreate) live in `src/bot/events/`. EventHandler loads and wires them to client.

## Code Conventions

### Imports
- **Path aliases** (tsconfig.json): `@config/*`, `@commands/*`, `@features/*`, `@utils/*`, `@logger/*`, `@dtypes/*`, `@handlers/*`, `@components/*`, `@bot/*`
- Use `.js` extensions in dynamic imports and relative paths (ESM Bun compatibility)

### Logging
```typescript
import { logger } from '@logger/index.js';
logger.info('message', { context: 'ModuleName' }); // add context field
logger.error('error', { error });  // always pass Error object
```
Winston config: max 30 files, 20MB per file, daily rotation in `./logs`

### Environment Variables
```typescript
import { getEnvironment } from '@config/environment.js';
const env = getEnvironment(); // Zod validates and caches on first call
```
Required: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`
Optional: `GITHUB_TOKEN`, `DASHBOARD_TOKEN`, `LOG_LEVEL` (default 'info')

### ESLint & Prettier
- **Strict TypeScript** (`strict: true`, no-explicit-any = warn)
- **Security warnings** (detect-non-literal-fs-filename, object-injection) are warnings, not errors
- **Trailing commas** (es5 style), **single quotes**, **100-char line width**, **2-space indent**
- **`no-console: warn`** — use logger instead
- **`prefer-const: error`** — let is forbidden
- **No `var`** — ES6+ only

### Command Structure
```typescript
// src/commands/category/commandname/index.ts
import type { PrefixCommand } from '@dtypes/bot';

const command: PrefixCommand = {
  name: 'mycommand',
  description: 'Does something',
  category: 'utility', // categories: utility, moderation, search, fun, core
  aliases: ['alias1', 'alias2'],
  prefix: true, // required to register as prefix command
  async execute(message: Message, args: string[]): Promise<void> {
    // reply or channel.send
  },
};

export default command;
```

### Permissions & Roles
Commands use `message.member?.permissions.has()` for permission checks. Define category colors in consuming modules (see `src/commands/utility/help/index.ts` for reference).

## Data & State

### Environment/Config
- `.env` file (gitignored) — set DISCORD_TOKEN, PREFIX, DEBUG flags
- `src/config/constants.ts` — shared constants (categories, colors, emojis)
- Zod schema in `src/config/environment.ts` — all env vars validated on startup

### Database
SQLite at `./data/database.db` (gitignored). Initialize schema in feature/service startup if needed.

### Caching
- Command cache in handler (reloads on file change in dev mode)
- Feature-specific caches (e.g., plugin search cache, dashboard session cache)

## Testing

```bash
bun test                    # All tests in tests/
bun test tests/unit         # Unit tests only
bun test tests/integration  # Integration tests only
```
Test files use `.test.ts` or `.spec.ts` suffix. Bun's built-in test runner (no external test framework required).

## Build & Deploy

```bash
# Development
bun run build && bun run start

# Web dashboard (React 19)
bun run web:build && bun run web:dev

# Production release (single-file binary)
bun build --compile ./src/index.ts --outfile ./shiggybot
```

Compiled output goes to `./dist/`. Use `bun run clean` to reset dist, data, logs.

## Git & Branches

- **Branches**: `dev` (development), `main` (releases)
- **Husky hooks**: `lint-staged` on pre-commit (eslint --fix, prettier --write)
- **Gitignore**: `appsettings.json`, `config.txt`, `.env`, `data/`, `dist/`, `logs/`, `node_modules/`

## Common Tasks

### Add a Prefix Command
1. Create `src/commands/category/name/index.ts`
2. Implement PrefixCommand interface
3. Export as default
4. CommandHandler auto-discovers on next reload

### Add an Event Handler
1. Create `src/bot/events/eventname/index.ts`
2. Export handler function: `(client: BotClient) => void`
3. EventHandler discovers and wires it

### Add a Feature
1. Create `src/features/featurename/index.ts`
2. Initialize in `src/bot/client.ts` before `client.login()`
3. Use logger for debugging

### Add Environment Variables
1. Add field to `envSchema` in `src/config/environment.ts`
2. Set in `.env` or CI/deploy config
3. Access via `getEnvironment().VAR_NAME`

## Known Patterns & Gotchas

- **No unit tests exist yet** — test suite is scaffolded but empty
- **Dashboard is React 19** — separate build step (`bun run web:build`)
- **Bun-specific**: Uses `import.meta.dir` in CommandHandler for dynamic imports; `bunx` for npm package execution
- **Discord.js v14**: messageContent intent required for `message.content`; ComponentsV2 requires IsComponentsV2 flag
- **Logging**: Winston rotates daily and by size; logs/* gitignored
- **Error handling**: Top-level uncaught exceptions exit with code 1; SIGINT/SIGTERM gracefully shutdown
- **Security**: ESLint rules warn on fs operations with non-literal paths, object injection (review before disabling)
