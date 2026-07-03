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
        private static readonly TimeSpan FallbackInterval = TimeSpan.FromHours(1);
        private static readonly TimeSpan Buffer = TimeSpan.FromSeconds(5);

        private readonly Lock _lock = new();
        private Timer? _timer;
        private bool _disposed;

        public void Start()
        {
            _timer = new Timer(async _ => await OnTimerAsync().ConfigureAwait(false), null, Timeout.InfiniteTimeSpan, Timeout.InfiniteTimeSpan);
            _ = ScheduleNextAsync();
            Logger.Info("[STARTUP] Ban check service started");
        }

        private async Task ScheduleNextAsync()
        {
            if (_disposed)
            {
                return;
            }

            try
            {
                DateTime? nextUnban = await db.GetNextUnbanTimeAsync().ConfigureAwait(false);

                TimeSpan delay = nextUnban.HasValue
                    ? nextUnban.Value - DateTime.UtcNow + Buffer
                    : FallbackInterval;

                if (delay < TimeSpan.Zero)
                {
                    delay = TimeSpan.Zero;
                }

                lock (_lock)
                {
                    _timer?.Change(delay, Timeout.InfiniteTimeSpan);
                }
            }
            catch (HttpRequestException ex)
            {
                ErrorHandler.LogError("Failed to query next unban time", ex);
                lock (_lock)
                {
                    _timer?.Change(FallbackInterval, Timeout.InfiniteTimeSpan);
                }
            }
            catch (SqliteException ex)
            {
                ErrorHandler.LogError("Database error scheduling next ban check", ex);
                lock (_lock)
                {
                    _timer?.Change(FallbackInterval, Timeout.InfiniteTimeSpan);
                }
            }
        }

        private async Task OnTimerAsync()
        {
            await CheckExpiredBansAsync().ConfigureAwait(false);
            _ = ScheduleNextAsync();
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
            lock (_lock)
            {
                _timer?.Dispose();
                _timer = null;
            }
        }

        public void Dispose()
        {
            if (_disposed)
            {
                return;
            }

            _disposed = true;
            Stop();
            GC.SuppressFinalize(this);
        }
    }
}
