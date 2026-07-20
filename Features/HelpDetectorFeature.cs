using System.Collections.Concurrent;
using Discord;
using Discord.WebSocket;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using ShiggyBot.Services;
using ShiggyBot.Utils;

namespace ShiggyBot.Features
{
    internal sealed class HelpDetectorFeature
    {
        private readonly DiscordSocketClient _client;
        private readonly ulong _helpChannelId;
        private readonly HashSet<ulong> _excludedChannelIds;
        private readonly CommandHandler _commandHandler;
        private static readonly ConcurrentDictionary<string, List<SocketMessage>> MessageHistory = new();
        private const int MaxMessagesPerUser = 5;

        public HelpDetectorFeature(DiscordSocketClient client, IConfiguration config, CommandHandler commandHandler)
        {
            _client = client;
            _commandHandler = commandHandler;

            string? chId = config["HELP_CHANNEL_ID"];
            if (!string.IsNullOrEmpty(chId)
                && ulong.TryParse(chId, System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out ulong id))
            {
                _helpChannelId = id;
            }
            else
            {
                _helpChannelId = 0;
                Logger.Warn("[HELP DETECT] HELP_CHANNEL_ID not set — help detection disabled");
            }

            _excludedChannelIds = [];
            string? excluded = config["HELP_EXCLUDED_CHANNEL_IDS"];
            if (!string.IsNullOrEmpty(excluded))
            {
                foreach (string part in excluded.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                {
                    if (ulong.TryParse(part, System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out ulong excludedId))
                    {
                        _excludedChannelIds.Add(excludedId);
                    }
                }
            }

            _client.MessageReceived += OnMessageReceivedAsync;
        }

        public void Unregister()
        {
            _client.MessageReceived -= OnMessageReceivedAsync;
        }

        private async Task OnMessageReceivedAsync(SocketMessage message)
        {
            try
            {
                if (message.Author.IsBot)
                {
                    return;
                }

                if (string.IsNullOrWhiteSpace(message.Content))
                {
                    return;
                }

                if (!HelpClassificationService.IsEnabled)
                {
                    return;
                }

                if (_helpChannelId == 0)
                {
                    return;
                }

                if (message.Channel.Id == _helpChannelId)
                {
                    return;
                }

                if (_excludedChannelIds.Contains(message.Channel.Id))
                {
                    return;
                }

                if (IsBotCommand(message.Content))
                {
                    return;
                }

                if (message.Channel is not SocketGuildChannel guildChannel)
                {
                    return;
                }

                string key = $"{guildChannel.Guild.Id}:{message.Author.Id}";

                List<SocketMessage> history = MessageHistory.GetOrAdd(key, _ => []);

                history.Add(message);

                while (history.Count > MaxMessagesPerUser)
                {
                    history.RemoveAt(0);
                }

                string combinedText = string.Join(" ", history
                    .Where(m => !string.IsNullOrWhiteSpace(m.Content))
                    .Select(m => m.Content));

                if (string.IsNullOrWhiteSpace(combinedText))
                {
                    return;
                }

                bool needsHelp = await HelpClassificationService.ClassifyAsync(combinedText).ConfigureAwait(false);

                if (!needsHelp)
                {
                    return;
                }

                MessageHistory.TryRemove(key, out _);

                SocketGuildChannel currentChannel = guildChannel;
                SocketTextChannel? helpChannel = guildChannel.Guild.GetTextChannel(_helpChannelId);

                if (helpChannel is null)
                {
                    return;
                }

                string currentName = currentChannel.Name;
                string helpName = helpChannel.Name;

                try
                {
                    byte[]? imageBytes = await HelpImageGenerator.GenerateAsync(currentName, helpName).ConfigureAwait(false);

                    if (imageBytes is null)
                    {
                        return;
                    }

                    string fileName = "help_pointer.png";

                    using MemoryStream stream = new(imageBytes);
                    FileAttachment attachment = new(stream, fileName);

                    await message.Channel.SendFileAsync(attachment, messageReference: new MessageReference(message.Id)).ConfigureAwait(false);
                }
                catch (IOException ex)
                {
                    Logger.Error($"[HELP DETECT] IO error sending image: {ex.Message}", ex);
                }
                catch (HttpRequestException ex)
                {
                    Logger.Error($"[HELP DETECT] HTTP error sending image: {ex.Message}", ex);
                }
            }
            catch (SqliteException ex)
            {
                Logger.Error($"[HELP DETECT] Database error: {ex.Message}", ex);
            }
            catch (InvalidOperationException ex)
            {
                Logger.Error($"[HELP DETECT] Invalid operation: {ex.Message}", ex);
            }
        }

        private bool IsBotCommand(string content)
        {
            string prefix = _commandHandler.Prefix;
            if (!content.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            string rest = content[prefix.Length..].Trim();
            if (rest.Length == 0)
            {
                return false;
            }

            string commandName = rest.Split(' ', StringSplitOptions.RemoveEmptyEntries)[0].ToUpperInvariant();
            return _commandHandler.GetCommandByName(commandName) is not null;
        }
    }
}
