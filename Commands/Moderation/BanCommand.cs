using System.Globalization;
using Discord.WebSocket;
using ShiggyBot.Components.V2;
using ShiggyBot.Utils;
using ShiggyBot.Data;

namespace ShiggyBot.Commands.Moderation
{
    /// <summary>
    /// Command to ban a user from the server (supports timed bans).
    /// </summary>
    internal sealed class BanCommand : ICommand
    {
        private const int PurgeDays = 7;

        private readonly ComponentsV2Client _v2Client;
        private readonly DatabaseService _db;

        /// <summary>
        /// Initializes a new instance of the <see cref="BanCommand"/> class.
        /// </summary>
        /// <param name="v2Client">The Components V2 client.</param>
        /// <param name="db">The database service.</param>
        internal BanCommand(ComponentsV2Client v2Client, DatabaseService db)
        {
            ArgumentNullException.ThrowIfNull(v2Client);
            ArgumentNullException.ThrowIfNull(db);
            _v2Client = v2Client;
            _db = db;
        }

        /// <summary>Gets the command name.</summary>
        public string Name => "ban";

        /// <summary>Gets the command description.</summary>
        public string Description => "Ban a user from the server (supports timed bans)";

        /// <summary>Gets the command category.</summary>
        public string Category => "Moderation";

        /// <summary>Gets the command aliases.</summary>
        public IReadOnlyList<string> Aliases => [];

        /// <summary>Executes the command.</summary>
        public async Task ExecuteAsync(SocketUserMessage message, string[] args, DiscordSocketClient client)
        {
            ArgumentNullException.ThrowIfNull(message);
            ArgumentNullException.ThrowIfNull(args);

            if (!await PermissionHelper.RequirePermissionAsync(message, global::Discord.GuildPermission.BanMembers).ConfigureAwait(false))
            {
                return;
            }

            SocketGuildChannel guildChannel = (SocketGuildChannel)message.Channel;
            SocketGuild guild = guildChannel.Guild;

            global::Discord.IGuildUser? user = message.ReferencedMessage is not null
                ? await PermissionHelper.ResolveRepliedUserAsync(guild, message).ConfigureAwait(false)
                : null;

            int offset = user is not null ? 0 : 1;

            if (args.Length < offset)
            {
                await SendUsageAsync(message).ConfigureAwait(false);
                return;
            }

            if (offset == 1)
            {
                user = await PermissionHelper.ResolveUserAsync(guild, args[0]).ConfigureAwait(false);
            }

            if (user is null)
            {
                await SendErrorAsync(message, "User not found.").ConfigureAwait(false);
                return;
            }

            string? rawDuration = null;
            TimeSpan? duration = null;
            int reasonStart = offset;
            if (args.Length > offset && TryParseDuration(args[offset], out TimeSpan parsedDuration))
            {
                rawDuration = args[offset];
                duration = parsedDuration;
                reasonStart = offset + 1;
            }

            string reason = args.Length > reasonStart ? string.Join(" ", args, reasonStart, args.Length - reasonStart) : "No reason provided";

            try
            {
                await global::Discord.UserExtensions.BanAsync(user, PurgeDays, reason).ConfigureAwait(false);

                if (duration.HasValue)
                {
                    DateTime unbanTime = DateTime.UtcNow.Add(duration.Value);
                    await _db.AddTimedBanAsync(guild.Id, user.Id, unbanTime, reason, message.Author.Id).ConfigureAwait(false);
                }

                string avatarUrl = user.GetAvatarUrl() ?? user.GetDefaultAvatarUrl();

                ContainerBuilder container = new ContainerBuilder()
                    .WithAccentColor(0xFF0000)
                    .AddComponent(new SectionBuilder()
                        .AddTextDisplay(new TextDisplayBuilder().WithContent("# \uD83D\uDEE1\uFE0F User Banned"))
                        .WithThumbnailAccessory(new ThumbnailBuilder()
                            .WithMedia(new Uri(avatarUrl))
                            .WithDescription(user.Username + " Avatar")))
                    .AddComponent(new SeparatorBuilder().WithSpacing(SeparatorSpacing.Small))
                    .AddComponent(new TextDisplayBuilder().WithContent(
                        "**User:** " + user.Mention + "\n" +
                        "**Moderator:** " + message.Author.Username + "\n" +
                        "**Reason:** " + reason));

                if (duration.HasValue && rawDuration is not null)
                {
                    container.AddComponent(new TextDisplayBuilder().WithContent("**Duration:** " + rawDuration));
                }

                V2MessageBuilder builder = new V2MessageBuilder()
                    .AddComponent(container);

                await _v2Client.SendMessageAsync(message.Channel.Id, builder).ConfigureAwait(false);
            }
            catch (HttpRequestException)
            {
                await SendErrorAsync(message, "Failed to ban user. Check role hierarchy.").ConfigureAwait(false);
            }
        }

        private async Task SendUsageAsync(SocketUserMessage message)
        {
            V2MessageBuilder builder = new V2MessageBuilder()
                .AddComponent(new ContainerBuilder()
                    .WithAccentColor(0xFFA500)
                    .AddComponent(new TextDisplayBuilder().WithContent(
                        "# \uD83D\uDEE1\uFE0F Ban Command\n\n" +
                        "Ban a user from the server\n\n" +
                        "## Usage\n" +
                        "`ban <user> [duration] [reason]`\n\n" +
                        "## Reply Usage\n" +
                        "Reply to a message with `ban [duration] [reason]`\n\n" +
                        "## Duration Format\n" +
                        "\uD83D\uDD52 s = seconds, m = minutes, h = hours, d = days (optional)\n\n" +
                        "## Example\n" +
                        "`ban @user 7d Breaking rules`")));

            await _v2Client.SendMessageAsync(message.Channel.Id, builder).ConfigureAwait(false);
        }

        private async Task SendErrorAsync(SocketUserMessage message, string error)
        {
            V2MessageBuilder builder = new V2MessageBuilder()
                .AddComponent(new ContainerBuilder()
                    .WithAccentColor(0xE74C3C)
                    .AddComponent(new TextDisplayBuilder().WithContent("# Error\n\n" + error)));

            await _v2Client.SendMessageAsync(message.Channel.Id, builder).ConfigureAwait(false);
        }

        private static bool TryParseDuration(string input, out TimeSpan duration)
        {
            duration = TimeSpan.Zero;
            if (string.IsNullOrEmpty(input))
            {
                return false;
            }

            try
            {
                if (input.EndsWith('s'))
                {
                    duration = TimeSpan.FromSeconds(int.Parse(input.TrimEnd('s'), CultureInfo.InvariantCulture));
                }
                else if (input.EndsWith('m'))
                {
                    duration = TimeSpan.FromMinutes(int.Parse(input.TrimEnd('m'), CultureInfo.InvariantCulture));
                }
                else if (input.EndsWith('h'))
                {
                    duration = TimeSpan.FromHours(int.Parse(input.TrimEnd('h'), CultureInfo.InvariantCulture));
                }
                else if (input.EndsWith('d'))
                {
                    duration = TimeSpan.FromDays(int.Parse(input.TrimEnd('d'), CultureInfo.InvariantCulture));
                }
                else
                {
                    return false;
                }

                return true;
            }
            catch (FormatException)
            {
                return false;
            }
        }
    }
}
