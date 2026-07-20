using System.Globalization;
using System.Text.RegularExpressions;
using SixLabors.Fonts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace ShiggyBot.Features
{
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Performance", "CA1810:Initialize reference types statically", Justification = "Font loading requires file I/O")]
    internal static partial class HelpImageGenerator
    {
        private const int ImageWidth = 400;
        private const int ImageHeight = 420;
        private const int EmojiSize = 24;

        private static readonly Font LabelFont;
        private static readonly Font ChannelFont;
        private static readonly Font HashFont;
        private static readonly Image<Rgba32> ArrowImage;
        private static readonly SemaphoreSlim GenerationLock = new(2, 2);

        private static readonly HttpClient HttpClient = new() { Timeout = TimeSpan.FromSeconds(5) };

        private static readonly Rgba32 DiscordDark = new(0x2A, 0x2C, 0x30, 255);
        private static readonly Rgba32 DiscordLight = new(0xDC, 0xDD, 0xDE, 255);
        private static readonly Rgba32 DiscordMuted = new(0x72, 0x76, 0x7D, 255);
        private static readonly Rgba32 Yellow = new(0xFE, 0xE7, 0x5C, 255);

        static HelpImageGenerator()
        {
            FontCollection collection = new();
            FontFamily comicBoldFamily = collection.Add(Path.Combine(AppContext.BaseDirectory, "assets", "ComicNeue-Bold.ttf"), CultureInfo.InvariantCulture);
            FontFamily sansFamily = collection.Add(Path.Combine(AppContext.BaseDirectory, "assets", "LiberationSans-Regular.ttf"), CultureInfo.InvariantCulture);
            FontFamily sansBoldFamily = collection.Add(Path.Combine(AppContext.BaseDirectory, "assets", "LiberationSans-Bold.ttf"), CultureInfo.InvariantCulture);

            LabelFont = comicBoldFamily.CreateFont(22, FontStyle.Bold);
            ChannelFont = sansFamily.CreateFont(18, FontStyle.Regular);
            HashFont = sansBoldFamily.CreateFont(20, FontStyle.Bold);

            using Image<Rgba32> arrowOriginal = Image.Load<Rgba32>(Path.Combine(AppContext.BaseDirectory, "assets", "red-arrow.png"));
            int targetH = 170;
            float scale = targetH / (float)arrowOriginal.Height;
            int targetW = (int)(arrowOriginal.Width * scale);
            ArrowImage = arrowOriginal.CloneAs<Rgba32>();
            ArrowImage.Mutate(ctx => ctx.Resize(targetW, targetH));
        }

        public static async Task<byte[]?> GenerateAsync(string currentChannelName, string helpChannelName)
        {
            if (!await GenerationLock.WaitAsync(0).ConfigureAwait(false))
            {
                return null;
            }

            try
            {
                return await Task.Run(() => GenerateCore(currentChannelName, helpChannelName)).ConfigureAwait(false);
            }
            finally
            {
                GenerationLock.Release();
            }
        }

        private static byte[] GenerateCore(string currentChannelName, string helpChannelName)
        {
            using Image<Rgba32> image = new(ImageWidth, ImageHeight);

            int cardW = 300;
            int cardH = 50;
            int cardX = (ImageWidth - cardW) / 2;
            int topCardY = 50;
            int botCardY = 290;

            DrawChannelCard(image, cardX, topCardY, cardW, cardH, currentChannelName);
            DrawChannelCard(image, cardX, botCardY, cardW, cardH, helpChannelName);

            DrawLabel(image, "you are here !!", ImageWidth / 2, topCardY - 30);
            DrawLabel(image, "go here instead !!", ImageWidth / 2, botCardY + cardH + 10);

            image.Mutate(ctx => ctx.DrawImage(ArrowImage, new Point((ImageWidth / 2) - (ArrowImage.Width / 2), topCardY + cardH + 20), 1f));

            using MemoryStream ms = new();
            image.SaveAsPng(ms);
            return ms.ToArray();
        }

        private static void DrawChannelCard(Image<Rgba32> image, int x, int y, int w, int h, string channelName)
        {
            image.Mutate(ctx =>
            {
                ctx.Fill(DiscordDark, new RectangleF(x, y, w, h));
                ctx.Draw(DiscordMuted, 2, new RectangleF(x, y, w, h));
            });

            image.Mutate(ctx => ctx.DrawText("#", HashFont, DiscordMuted, new PointF(x + 14, y + 12)));
            DrawTextWithEmojis(image, channelName, DiscordLight, x + 40, y + 14);
        }

        private static void DrawLabel(Image<Rgba32> image, string text, int centerX, int y)
        {
            TextOptions options = new(LabelFont);
            FontRectangle size = TextMeasurer.MeasureAdvance(text, options);
            float tx = centerX - (size.Width / 2);

            image.Mutate(ctx => ctx.DrawText(text, LabelFont, Yellow, new PointF(tx, y)));
        }

        private static void DrawTextWithEmojis(Image<Rgba32> image, string text, Color color, float x, float y)
        {
            List<TextSegment> segments = ParseEmojiSegments(text);
            float currentX = x;

            foreach (TextSegment segment in segments)
            {
                if (segment.IsEmoji)
                {
                    Image<Rgba32>? emojiImage = GetEmojiImage(segment.Codepoints);
                    if (emojiImage is not null)
                    {
                        int emojiY = (int)y;
                        image.Mutate(ctx => ctx.DrawImage(emojiImage, new Point((int)currentX - 4, emojiY), 1f));
                        currentX += EmojiSize;
                    }
                }
                else if (segment.Text.Length > 0)
                {
                    image.Mutate(ctx => ctx.DrawText(segment.Text, ChannelFont, color, new PointF(currentX, y)));
                    FontRectangle advance = TextMeasurer.MeasureAdvance(segment.Text, new TextOptions(ChannelFont));
                    currentX += advance.Width;
                }
            }
        }

        private static List<TextSegment> ParseEmojiSegments(string text)
        {
            List<TextSegment> segments = [];
            MatchCollection matches = EmojiRegex().Matches(text);

            int lastIndex = 0;
            foreach (Match match in matches)
            {
                if (match.Index > lastIndex)
                {
                    segments.Add(new TextSegment(text[lastIndex..match.Index], false, ""));
                }

                string codepoints = EmojiToCodepoints(match.Value);
                segments.Add(new TextSegment("", true, codepoints));
                lastIndex = match.Index + match.Length;
            }

            if (lastIndex < text.Length)
            {
                segments.Add(new TextSegment(text[lastIndex..], false, ""));
            }

            return segments;
        }

        private static string EmojiToCodepoints(string emoji)
        {
            List<string> cps = [];
            for (int i = 0; i < emoji.Length; i++)
            {
                if (char.IsHighSurrogate(emoji[i]) && i + 1 < emoji.Length && char.IsLowSurrogate(emoji[i + 1]))
                {
                    int cp = char.ConvertToUtf32(emoji[i], emoji[i + 1]);
                    cps.Add(cp.ToString("x", CultureInfo.InvariantCulture));
                    i++;
                }
                else
                {
                    cps.Add(((int)emoji[i]).ToString("x", CultureInfo.InvariantCulture));
                }
            }

            return string.Join("-", cps);
        }

        private static Image<Rgba32>? GetEmojiImage(string codepoints)
        {
            try
            {
                Uri url = new($"https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/{codepoints}.png");
                HttpResponseMessage response = HttpClient.GetAsync(url).GetAwaiter().GetResult();
                if (!response.IsSuccessStatusCode)
                {
                    return null;
                }

                byte[] bytes = response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult();
                Image<Rgba32> emoji = Image.Load<Rgba32>(bytes);
                emoji.Mutate(ctx => ctx.Resize(EmojiSize, EmojiSize));
                return emoji;
            }
            catch (HttpRequestException)
            {
                return null;
            }
            catch (TimeoutException)
            {
                return null;
            }
        }

        private sealed record TextSegment(string Text, bool IsEmoji, string Codepoints);

        [GeneratedRegex(@"([\uD83C-\uD83F][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\u2B00-\u2BFF]|[\uFE0F\u200D\u20E3])+", RegexOptions.Compiled)]
        private static partial Regex EmojiRegex();
    }
}
