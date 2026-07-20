using System.Text.Json;
using Microsoft.Extensions.Configuration;
using ShiggyBot.Utils;

namespace ShiggyBot.Features
{
    /// <summary>Improves issue descriptions via the HuggingFace Inference API.</summary>
    internal static class AiImproveService
    {
        private static readonly HttpClient Http = new();

        /// <summary>Gets whether the service is ready to handle requests.</summary>
        public static bool IsEnabled { get; private set; }

        /// <summary>Initializes the service with the HuggingFace token from configuration.</summary>
        public static void Initialize(IConfiguration config)
        {
            string? token = config["HF_TOKEN"];
            if (string.IsNullOrWhiteSpace(token))
            {
                Logger.Warn("[AI] HF_TOKEN not set — AI improve disabled");
                return;
            }

            Http.Timeout = TimeSpan.FromSeconds(30);
            Http.DefaultRequestHeaders.UserAgent.ParseAdd("ShiggyBot/1.0");
            Http.DefaultRequestHeaders.Authorization = new("Bearer", token);
            IsEnabled = true;
            Logger.Info("[AI] HuggingFace AI service initialized");
        }

        /// <summary>Sends the issue title + description to HuggingFace and returns an improved version.</summary>
        public static async Task<string?> ImproveAsync(string title, string description)
        {
            if (!IsEnabled)
            {
                return null;
            }

            string userPrompt = "You are given an issue title and description. Improve ONLY the description text to be clearer, more structured, and more professional. "
                + "Keep the original meaning and intent. "
                + "Output ONLY the improved description text — no greetings, no explanations, no headings, no labels like 'Title:' or 'Description:'.\n\n"
                + $"Title: {title}\nDescription: {description}";

            object payload = new
            {
                model = "Qwen/Qwen2.5-7B-Instruct",
                messages = new object[]
                {
                    new { role = "system", content = "You improve issue and bug report descriptions. Output ONLY the improved text." },
                    new { role = "user", content = userPrompt }
                },
                max_tokens = 1024,
                temperature = 0.7
            };

            string json = JsonSerializer.Serialize(payload);
            using StringContent content = new(json, System.Text.Encoding.UTF8, "application/json");

            Uri uri = new("https://router.huggingface.co/v1/chat/completions");
            using HttpResponseMessage response = await Http
                .PostAsync(uri, content)
                .ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                string? body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                Logger.Error($"[AI] HuggingFace API error: {response.StatusCode} {body}");
                return null;
            }

            string responseJson = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
            using JsonDocument doc = JsonDocument.Parse(responseJson);

            string? improved = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            return string.IsNullOrWhiteSpace(improved) ? null : improved;
        }
    }
}
