using System.Collections.Concurrent;
using Discord.WebSocket;
using ShiggyBot.Utils;

namespace ShiggyBot.Services
{
    /// <summary>
    /// Service for handling ephemeral button interactions.
    /// </summary>
    internal static class EphemeralButtonService
    {
        private static readonly ConcurrentDictionary<string, Func<SocketMessageComponent, Task>> _handlers = new();

        /// <summary>
        /// Registers a one-shot ephemeral handler for a specific button.
        /// </summary>
        /// <param name="key">The custom ID of the button.</param>
        /// <param name="handler">The handler function to execute.</param>
        public static void Register(string key, Func<SocketMessageComponent, Task> handler)
        {
            _handlers[key] = handler;
        }

        /// <summary>
        /// Tries to handle an incoming button interaction.
        /// </summary>
        /// <param name="component">The socket message component.</param>
        /// <returns>True if handled; otherwise, false.</returns>
        public static bool TryHandle(SocketMessageComponent? component)
        {
            if (component?.Data?.CustomId == null)
            {
                return false;
            }
            string key = component.Data.CustomId;
            if (_handlers.TryRemove(key, out Func<SocketMessageComponent, Task>? handler))
            {
                _ = HandleSafeAsync(component, handler);
                return true;
            }
            return false;
        }

        private static async Task HandleSafeAsync(SocketMessageComponent component, Func<SocketMessageComponent, Task> handler)
        {
            try
            {
                await handler(component).ConfigureAwait(false);
            }
            catch (HttpRequestException ex)
            {
                Logger.Error($"[BUTTON] Handler failed for '{component.Data.CustomId}': {ex.Message}", ex);
                await SendFallbackResponseAsync(component).ConfigureAwait(false);
            }
            catch (InvalidOperationException ex)
            {
                Logger.Error($"[BUTTON] Handler failed for '{component.Data.CustomId}': {ex.Message}", ex);
                await SendFallbackResponseAsync(component).ConfigureAwait(false);
            }
            catch (TimeoutException ex)
            {
                Logger.Error($"[BUTTON] Handler failed for '{component.Data.CustomId}': {ex.Message}", ex);
                await SendFallbackResponseAsync(component).ConfigureAwait(false);
            }
            catch (OperationCanceledException ex)
            {
                Logger.Error($"[BUTTON] Handler failed for '{component.Data.CustomId}': {ex.Message}", ex);
                await SendFallbackResponseAsync(component).ConfigureAwait(false);
            }
            catch (global::Discord.Net.HttpException ex)
            {
                Logger.Error($"[BUTTON] Handler failed for '{component.Data.CustomId}': {ex.Message}", ex);
                await SendFallbackResponseAsync(component).ConfigureAwait(false);
            }
        }

        private static async Task SendFallbackResponseAsync(SocketMessageComponent component)
        {
            try
            {
                await component.RespondAsync("An error occurred while processing this interaction.", ephemeral: true).ConfigureAwait(false);
            }
            catch (InvalidOperationException)
            {
            }
            catch (TimeoutException)
            {
            }
        }
    }
}
