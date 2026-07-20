using System.Text.Json;
using Microsoft.Extensions.Configuration;
using ShiggyBot.Utils;

namespace ShiggyBot.Features
{
    internal static class HelpClassificationService
    {
        private static readonly HttpClient Http = new();

        private const string SystemPrompt = "You are a help-seeking message classifier for a Discord server. "
            + "Given a user's recent messages, determine if they are asking for technical help or reporting a problem. "
            + "Reply with ONLY the word YES if they need help, or ONLY the word NO if they don't. "
            + "Be generous — if someone seems confused, frustrated, or is describing something going wrong, say YES.";

        public static bool IsEnabled { get; private set; }

        public static void Initialize(IConfiguration config)
        {
            string? token = config["HF_TOKEN"];
            if (string.IsNullOrWhiteSpace(token))
            {
                Logger.Warn("[HELP DETECT] HF_TOKEN not set — help detection disabled");
                return;
            }

            Http.Timeout = TimeSpan.FromSeconds(10);
            Http.DefaultRequestHeaders.UserAgent.ParseAdd("ShiggyBot/1.0");
            Http.DefaultRequestHeaders.Authorization = new("Bearer", token);
            IsEnabled = true;
            Logger.Info("[HELP DETECT] Help classification service initialized");
        }

        public static async Task<bool> ClassifyAsync(string text)
        {
            if (!IsEnabled)
            {
                return false;
            }

            if (string.IsNullOrWhiteSpace(text))
            {
                return false;
            }

            try
            {
                object payload = new
                {
                    model = "Qwen/Qwen2.5-7B-Instruct",
                    messages = new object[]
                    {
                        new { role = "system", content = SystemPrompt },
                        new { role = "user", content = text }
                    },
                    max_tokens = 5,
                    temperature = 0.0
                };

                string json = JsonSerializer.Serialize(payload);
                using StringContent content = new(json, System.Text.Encoding.UTF8, "application/json");

                Uri uri = new("https://router.huggingface.co/v1/chat/completions");
                using HttpResponseMessage response = await Http.PostAsync(uri, content).ConfigureAwait(false);

                if (!response.IsSuccessStatusCode)
                {
                    string? body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                    Logger.Error($"[HELP DETECT] HuggingFace API error: {response.StatusCode} {body}");
                    return false;
                }

                string responseJson = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                using JsonDocument doc = JsonDocument.Parse(responseJson);

                string? reply = doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString();

                return reply is not null && reply.Trim().StartsWith("YES", StringComparison.OrdinalIgnoreCase);
            }
            catch (HttpRequestException ex)
            {
                Logger.Error($"[HELP DETECT] HTTP error: {ex.Message}", ex);
                return false;
            }
            catch (JsonException ex)
            {
                Logger.Error($"[HELP DETECT] JSON parse error: {ex.Message}", ex);
                return false;
            }
        }
    }
}
