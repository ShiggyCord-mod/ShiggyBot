using Discord;
using Discord.Net;
using Discord.WebSocket;
using Microsoft.Data.Sqlite;
using ShiggyBot.Data;
using ShiggyBot.Utils;

namespace ShiggyBot.Services
{
    internal sealed class BanCheckService(DiscordSocketClient client, DatabaseService db) : IDisposable
    {
        private Timer? _timer;

        public void Start()
        {
            _timer = new Timer(async _ => await CheckExpiredBansAsync().ConfigureAwait(false), null, TimeSpan.Zero, TimeSpan.FromMinutes(5));
            Logger.Info("[STARTUP] Ban check service started");
        }

        private async Task CheckExpiredBansAsync()
        {
            try
            {
                List<TimedBan> expiredBans = await db.GetExpiredBansAsync().ConfigureAwait(false);
                foreach (TimedBan ban in expiredBans)
                {
                    try
                    {
                        SocketGuild? guild = client.GetGuild(ban.GuildId);
                        if (guild != null)
                        {
                            await guild.RemoveBanAsync(ban.UserId).ConfigureAwait(false);
                        }

                        await db.RemoveTimedBanAsync(ban.GuildId, ban.UserId).ConfigureAwait(false);
                    }
                    catch (HttpException ex) when (ex.DiscordCode == DiscordErrorCode.UnknownBan)
                    {
                        await db.RemoveTimedBanAsync(ban.GuildId, ban.UserId).ConfigureAwait(false);
                    }
                }
            }
            catch (HttpRequestException ex)
            {
                ErrorHandler.LogError("Failed to check expired bans", ex);
            }
            catch (TaskCanceledException ex)
            {
                ErrorHandler.LogError("Timeout checking expired bans", ex);
            }
            catch (SqliteException ex)
            {
                ErrorHandler.LogError("Database error in ban check loop", ex);
            }
            catch (InvalidOperationException ex)
            {
                ErrorHandler.LogError("Discord error in ban check loop", ex);
            }
        }

        public void Stop()
        {
            _timer?.Dispose();
        }

        public void Dispose()
        {
            _timer?.Dispose();
            GC.SuppressFinalize(this);
        }
    }
}
