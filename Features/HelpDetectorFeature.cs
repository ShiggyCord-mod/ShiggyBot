using System.Collections.Concurrent;
using Discord;
using Discord.WebSocket;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using ShiggyBot.Utils;

namespace ShiggyBot.Features
{
    internal sealed class HelpDetectorFeature
    {
        private readonly DiscordSocketClient _client;
        private readonly ulong _helpChannelId;
        private static readonly ConcurrentDictionary<string, List<SocketMessage>> MessageHistory = new();
        private const int MaxMessagesPerUser = 5;

        public HelpDetectorFeature(DiscordSocketClient client, IConfiguration config)
        {
            _client = client;

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
                    byte[] imageBytes = HelpImageGenerator.Generate(currentName, helpName);
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
    }
}
