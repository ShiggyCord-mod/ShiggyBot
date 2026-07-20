using System.Collections.Concurrent;
using System.Globalization;

namespace ShiggyBot.Features
{
    /// <summary>Holds the state of an in-progress issue template creation.</summary>
    internal sealed class IssueState
    {
        /// <summary>Gets or sets the issue title.</summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>Gets or sets the issue description.</summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>Gets or sets the selected target channel ID.</summary>
        public ulong? ChannelId { get; set; }

        /// <summary>Gets or sets the selected role ID to ping.</summary>
        public ulong? RoleId { get; set; }

        /// <summary>Gets or sets the author's user ID.</summary>
        public ulong AuthorId { get; set; }

        /// <summary>Gets or sets the channel ID where the issue was sent.</summary>
        public ulong? SentChannelId { get; set; }

        /// <summary>Gets or sets the message ID of the sent issue.</summary>
        public ulong? SentMessageId { get; set; }

        /// <summary>Gets or sets the message ID of the preview message.</summary>
        public ulong? PreviewMessageId { get; set; }

        /// <summary>Gets or sets whether the issue has been sent.</summary>
        public bool IsSent => SentMessageId.HasValue;
    }

    /// <summary>Thread-safe cache for in-flight issue states, keyed by author ID.</summary>
    internal static class IssueStateCache
    {
        private static readonly ConcurrentDictionary<string, IssueState> States = new();

        /// <summary>Gets or creates an issue state for the given author.</summary>
        public static IssueState GetOrCreate(ulong authorId)
        {
            string key = authorId.ToString(CultureInfo.InvariantCulture);
            return States.GetOrAdd(key, static (k, id) => new IssueState { AuthorId = id }, authorId);
        }

        /// <summary>Tries to get the issue state for the given author.</summary>
        public static bool TryGet(ulong authorId, out IssueState? state)
        {
            return States.TryGetValue(authorId.ToString(CultureInfo.InvariantCulture), out state);
        }

        /// <summary>Removes the issue state for the given author.</summary>
        public static void Remove(ulong authorId)
        {
            States.TryRemove(authorId.ToString(CultureInfo.InvariantCulture), out _);
        }
    }
}
