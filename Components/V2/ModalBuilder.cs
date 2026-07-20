namespace ShiggyBot.Components.V2
{
    /// <summary>
    /// Builds and sends a modal interaction response without requiring the Discord namespace at call sites.
    /// Wraps Discord.Net's ModalBuilder internally.
    /// </summary>
    internal sealed class ModalBuilder
    {
        private readonly global::Discord.ModalBuilder _inner = new();

        /// <summary>Sets the custom ID of the modal.</summary>
        public ModalBuilder WithCustomId(string customId)
        {
            _inner.WithCustomId(customId);
            return this;
        }

        /// <summary>Sets the title displayed at the top of the modal.</summary>
        public ModalBuilder WithTitle(string title)
        {
            _inner.WithTitle(title);
            return this;
        }

        /// <summary>Adds a text input component to the modal.</summary>
        public ModalBuilder AddTextInput(
            string label,
            string customId,
            TextInputStyle style = TextInputStyle.Short,
            string? placeholder = null,
            int? minLength = null,
            int? maxLength = null,
            bool required = false,
            string? defaultValue = null)
        {
            global::Discord.TextInputStyle discordStyle = style switch
            {
                TextInputStyle.Short => global::Discord.TextInputStyle.Short,
                TextInputStyle.Paragraph => global::Discord.TextInputStyle.Paragraph,
                _ => global::Discord.TextInputStyle.Short
            };

            _inner.AddTextInput(label, customId, discordStyle, placeholder, minLength ?? 0, maxLength, required, defaultValue);
            return this;
        }

        /// <summary>Sends the modal as a response to the given interaction.</summary>
        public async Task SendAsync(global::Discord.WebSocket.SocketMessageComponent interaction)
        {
            global::Discord.Modal modal = _inner.Build();
            await interaction.RespondWithModalAsync(modal).ConfigureAwait(false);
        }
    }
}
