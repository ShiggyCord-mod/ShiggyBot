# ShiggyBot

Discord bot — C# 13, .NET 10, Discord.Net 3.20.1, SQLite.

## Build & run

```bash
dotnet build                    # build only
dotnet build && dotnet run      # build + run (needs DISCORD_TOKEN)
dotnet publish -c Release -r linux-x64 --self-contained  # single-file publish
```

**`TreatWarningsAsErrors=true` + `AnalysisMode=All`** — build fails on **any** warning. The `.editorconfig` enables dozens of IDE/CA rules at `warning` level. `CS1591` (missing XML doc on public/internal API) is also `warning` because `GenerateDocumentationFile=true`. `IDE0058` (unused expression result) is the notable exception — it's `silent` for Discord.NET fluent builder patterns.

## Config

### Loading order (later overrides earlier)

1. `appsettings.json` (optional, gitignored — contains a real token on disk)
2. Environment variables
3. `config.txt` (optional, INI-style `KEY=VALUE`, `#` comments)
4. `DISCORD_TOKEN` and `PREFIX` fall back to `Environment.GetEnvironmentVariable()` in `BotConfig.LoadFromConfiguration`

**Gotcha:** `config.txt` parser uses `Split('=', 2)` — values containing `=` are truncated.

### Expected keys

`DISCORD_TOKEN` (required), `PREFIX` (default `S`), `WELCOME_ROLE_ID`, `PRESENCE_STATUS` (default `online`), `PRESENCE_INTERVAL` (default `300`), `LOG_WEBHOOK_URL`, `HF_TOKEN`, `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_WEBHOOK_CHANNEL_ID`, `DEV_GUILD_ID`.

## Architecture

- **`Program.cs`** — top-level statements, global exception handlers, manual construction (no DI container, no generic host). Blocks at the end via `Task.Delay(-1)`.
- **`DiscordClientService`** — creates `DiscordSocketClient`, initializes all features, wires event handlers, connects.
- **No `IHostedService`** — `DiscordClientService` is manually created, `StartAsync()` runs synchronously (blocking call).
- **No unit tests** — no test project exists.

### Gateway intents

```csharp
GatewayIntents.Guilds | GatewayIntents.GuildMembers | GatewayIntents.GuildMessages | GatewayIntents.MessageContent
```
Update `DiscordSocketConfig` in `DiscordClientService` if adding features that need more.

## V1 / V2 component split

The bot has two component systems. Commands are registered conditionally based on which client is available:

| Client | When null | Commands |
|--------|-----------|----------|
| `ComponentsV1Client` | Token is null/empty | `ping`, `note`, `kick`, `purge`, `addrole`, `removerole`, `nuke`, `disable`, `enable`, `setwelcome`, `google`, `mpreg`, `v1` |
| `ComponentsV2Client` | Token is null/empty | `help`, `plugin`, `timeout`, `ban`, `v2` |

**Both** are null when token is empty = **no commands registered**.

### Interaction handling chain (button clicks)

1. `EphemeralButtonService.TryHandle` (one-shot, `TryRemove` from `ConcurrentDictionary`)
2. `CommitPreviewFeature.TryHandleButton` (pagination)
3. Fallback: "This button is no longer available."

`TryHandle` fires the handler via `_ = handler(component)` — handler runs as fire-and-forget on the thread pool.

## Commands

Prefix is `S` by default. All commands show lower-case names in help but match case-insensitively.

| Command | Category | Notes |
|---------|----------|-------|
| `Shelp` | Utility | Interactive select menu (V2), falls back to V1 embeds |
| `Sping` | Utility | Latency check (V1) |
| `Snote <key>` | Utility | 8 hard-coded notes about ShiggyCord; reply-to support (V1) |
| `Sban <user> [duration] [reason]` | Moderation | Timed bans (`7d`, `30m`, etc.); purge 7 days; reply-to; persists to DB (V2) |
| `Skick <user> [reason]` | Moderation | Reply-to-shortcut (V1) |
| `Stimeout <user> [duration]` | Moderation | Reply-to-shortcut (V2) |
| `Spurge <count>` | Moderation | 1–100, 14-day Discord limit (V1) |
| `Snuke confirm` | Moderation | Clones channel, deletes original; Admin only (V1) |
| `Saddrole` / `Sremoverole` | Moderation | Reply-to-shortcut (V1) |
| `Sdisable` / `Senable` | Moderation | Per-guild command disable, persisted to DB; `ManageGuild` required (V1) |
| `Ssetwelcome <role>` | Core | Sets autorole; `disable`/`none`/`off` to disable (V1) |
| `Splugin <name>` | Search | Remote plugin index (60 min cache), Levenshtein search, ephemeral install button (V2) |
| `Sgoogle <query>` | Search | Generates Google search link; aliases: `g`, `search` (V1) |
| `Smpreg` | Fun | ImageSharp avatar compositing; disk + memory LRU cache (100 items) (V1) |
| `Sv1` | Core | Owner-only; V1 component test |
| `Sv2 [raw]` | Core | Owner-only; V2 component test; `raw` shows JSON payload |

**No `Sai` command exists** in the codebase despite being mentioned in README/AGENTS.md.

## Extending

- **New command:** implement `ICommand` in `Commands/<Category>/`, add `Register(new FooCommand())` in `CommandHandler.RegisterCommands()`. Choose V1 or V2 builder depending on target client.
- **New feature:** create class under `Features/`, initialize in `DiscordClientService.StartAsync()` before the `ConnectAsync` call.
- **New data:** extend `DatabaseService` — schema initializes on startup via `CREATE TABLE IF NOT EXISTS`. Single `SqliteConnection` kept open for lifetime (not thread-safe — single-threaded usage by design).

## Key patterns & gotchas

- **Static `HttpClient` instances** exist in 6+ classes (no centralized factory). Most lack an explicit `Timeout` (defaults to 100s). `MonitorService` is the exception (15s timeout).
- **`System.Threading.Lock`** (C# 13 / .NET 9+) used in BanCheckService and cache eviction. Not all locks use this — some use `lock` statements.
- **BanCheckService** uses a one-shot `Timer` pattern (re-armed after each check), not periodic polling.
- **PresenceFeature** lives in `Discord/` (not `Features/`). Uses `volatile bool _updating` to prevent overlapping timer ticks.
- **GitHub monitor** (`MonitorService`) polls every 5 minutes. In-memory dedup (`HashSet`) resets on restart. First poll caches state silently.
- **PluginService** caches remote index for 60 minutes in memory.
- **WebhookLogger** pings hardcoded user ID `879393496627306587` in every error webhook.
- **`PublishSingleFile=true`** in release — CSproj hardcodes `RuntimeIdentifier=linux-x64` for local builds.
- **CI** builds on push/PR to `dev` (ubuntu-latest, .NET 10 SDK). **Release** triggers on push to `main`, builds `win-x64`/`linux-x64`/`osx-x64` single-file bundles.

### Discord.Net 3.20.1 V2 ambiguity

Discord.Net 3.20.1 ships its own `ContainerBuilder`, `SectionBuilder`, `TextDisplayBuilder`, etc. under the `Discord` namespace. ShiggyBot's `Components/V2/` has identically named types. Files that `using Discord;` AND `using ShiggyBot.Components.V2;` get ambiguous references. Use `global::Discord.` qualification or using-aliases for disambiguated types.

## Git

- `appsettings.json`, `shiggybot.db`, `config.txt`, `bin/`, `obj/`, `publish/` are gitignored
- Never commit a real `DISCORD_TOKEN`
- Branch model: `dev` for development, `main` for releases
