using System.Globalization;
using Discord;
using Discord.WebSocket;
using ShiggyBot.Components.V2;
using ShiggyBot.Utils;

namespace ShiggyBot.Features
{
    /// <summary>
    /// Handles all interaction logic for the issue template feature.
    /// Routed from DiscordClientService; keeps issue concerns out of the service layer.
    /// </summary>
    internal sealed class IssueHandler
    {
        private readonly DiscordSocketClient _client;
        private readonly ComponentsV2Client _v2Client;

        internal IssueHandler(DiscordSocketClient client, ComponentsV2Client v2Client)
        {
            ArgumentNullException.ThrowIfNull(client);
            ArgumentNullException.ThrowIfNull(v2Client);
            _client = client;
            _v2Client = v2Client;
        }

        /// <summary>Tries to handle a button interaction for the issue feature.</summary>
        /// <returns>True if the interaction was handled.</returns>
        internal bool TryHandleButton(SocketMessageComponent component)
        {
            string customId = component.Data.CustomId;

            if (customId == "issue_ai_improve")
            {
                _ = HandleAiImproveAsync(component);
                return true;
            }

            if (customId == "issue_send")
            {
                _ = HandleSendAsync(component);
                return true;
            }

            if (customId.StartsWith("issue_edit_", StringComparison.Ordinal))
            {
                _ = HandleEditAsync(component);
                return true;
            }

            return false;
        }

        /// <summary>Tries to handle a select menu interaction for the issue feature.</summary>
        /// <returns>True if the interaction was handled.</returns>
        internal bool TryHandleSelectMenu(SocketMessageComponent component)
        {
            string customId = component.Data.CustomId;

            if (customId == "issue_channel_select")
            {
                _ = HandleChannelSelectAsync(component);
                return true;
            }

            if (customId == "issue_role_select")
            {
                _ = HandleRoleSelectAsync(component);
                return true;
            }

            return false;
        }

        /// <summary>Tries to handle a modal submission for the issue feature.</summary>
        /// <returns>True if the interaction was handled.</returns>
        internal bool TryHandleModal(SocketModal modal)
        {
            string customId = modal.Data.CustomId;

            if (customId.StartsWith("issue_modal_", StringComparison.Ordinal)
                && !customId.StartsWith("issue_edit_modal_", StringComparison.Ordinal))
            {
                _ = HandleModalAsync(modal);
                return true;
            }

            if (customId.StartsWith("issue_edit_modal_", StringComparison.Ordinal))
            {
                _ = HandleEditModalAsync(modal);
                return true;
            }

            return false;
        }

        private async Task HandleModalAsync(SocketModal modal)
        {
            try
            {
                string title = string.Empty;
                string description = string.Empty;

                foreach (SocketMessageComponentData component in modal.Data.Components)
                {
                    if (component.CustomId == "issue_title")
                    {
                        title = component.Value ?? string.Empty;
                    }
                    else if (component.CustomId == "issue_description")
                    {
                        description = component.Value ?? string.Empty;
                    }
                }

                if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(description))
                {
                    await modal.RespondAsync("Title and description are required.", ephemeral: true).ConfigureAwait(false);
                    return;
                }

                IssueState state = IssueStateCache.GetOrCreate(modal.User.Id);
                state.Title = title;
                state.Description = description;
                state.ChannelId = null;
                state.RoleId = null;
                state.SentChannelId = null;
                state.SentMessageId = null;

                await modal.DeferAsync(ephemeral: true).ConfigureAwait(false);

                if (modal.Channel is SocketGuildChannel guildChannel)
                {
                    V2MessageBuilder preview = BuildPreviewPayload(state, guildChannel.Guild);
                    ulong? previewMsgId = await _v2Client.SendMessageAsync(modal.Channel.Id, preview).ConfigureAwait(false);
                    if (previewMsgId.HasValue)
                    {
                        state.PreviewMessageId = previewMsgId.Value;
                    }
                }
            }
            catch (HttpRequestException ex)
            {
                Logger.Error($"[ISSUE] Modal handler error: {ex.Message}", ex);
            }
            catch (InvalidOperationException ex)
            {
                Logger.Error($"[ISSUE] Modal handler error: {ex.Message}", ex);
            }
            catch (TaskCanceledException ex)
            {
                Logger.Error($"[ISSUE] Modal handler error: {ex.Message}", ex);
            }
        }

        private async Task HandleEditModalAsync(SocketModal modal)
        {
            try
            {
                if (!IssueStateCache.TryGet(modal.User.Id, out IssueState? state) || state is null)
                {
                    await modal.RespondAsync("No issue to edit.", ephemeral: true).ConfigureAwait(false);
                    return;
                }

                string title = string.Empty;
                string description = string.Empty;

                foreach (SocketMessageComponentData component in modal.Data.Components)
                {
                    if (component.CustomId == "issue_edit_title")
                    {
                        title = component.Value ?? string.Empty;
                    }
                    else if (component.CustomId == "issue_edit_description")
                    {
                        description = component.Value ?? string.Empty;
                    }
                }

                if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(description))
                {
                    await modal.RespondAsync("Title and description are required.", ephemeral: true).ConfigureAwait(false);
                    return;
                }

                state.Title = title;
                state.Description = description;

                await modal.DeferAsync(ephemeral: true).ConfigureAwait(false);

                if (state.SentChannelId.HasValue && state.SentMessageId.HasValue)
                {
                    V2MessageBuilder sentPayload = BuildSentPayload(state);
                    await _v2Client.EditMessageAsync(state.SentChannelId.Value, state.SentMessageId.Value, sentPayload).ConfigureAwait(false);
                }

                if (state.PreviewMessageId.HasValue && modal.Channel is SocketGuildChannel guildChannel)
                {
                    V2MessageBuilder sentPreview = state.IsSent
                        ? BuildSentPreviewPayload(state, guildChannel.Guild)
                        : BuildPreviewPayload(state, guildChannel.Guild);
                    await _v2Client.EditMessageAsync(modal.Channel.Id, state.PreviewMessageId.Value, sentPreview).ConfigureAwait(false);
                }
            }
            catch (HttpRequestException ex)
            {
                Logger.Error($"[ISSUE] Edit modal error: {ex.Message}", ex);
            }
            catch (InvalidOperationException ex)
            {
                Logger.Error($"[ISSUE] Edit modal error: {ex.Message}", ex);
            }
            catch (TaskCanceledException ex)
            {
                Logger.Error($"[ISSUE] Edit modal error: {ex.Message}", ex);
            }
        }

        private async Task HandleChannelSelectAsync(SocketMessageComponent component)
        {
            if (!IssueStateCache.TryGet(component.User.Id, out IssueState? state) || state is null)
            {
                await component.RespondAsync("This is not your issue template.", ephemeral: true).ConfigureAwait(false);
                return;
            }

            string selected = component.Data.Values.First();
            state.ChannelId = selected == "none" ? null : ulong.Parse(selected, CultureInfo.InvariantCulture);

            await component.DeferAsync().ConfigureAwait(false);

            if (await _client.GetChannelAsync(component.ChannelId!.Value).ConfigureAwait(false) is SocketGuildChannel guildChannel)
            {
                V2MessageBuilder preview = state.IsSent
                    ? BuildSentPreviewPayload(state, guildChannel.Guild)
                    : BuildPreviewPayload(state, guildChannel.Guild);
                await _v2Client.EditMessageAsync(component.ChannelId!.Value, component.Message.Id, preview).ConfigureAwait(false);
            }
        }

        private async Task HandleRoleSelectAsync(SocketMessageComponent component)
        {
            if (!IssueStateCache.TryGet(component.User.Id, out IssueState? state) || state is null)
            {
                await component.RespondAsync("This is not your issue template.", ephemeral: true).ConfigureAwait(false);
                return;
            }

            string selected = component.Data.Values.First();
            state.RoleId = selected == "none" ? null : ulong.Parse(selected, CultureInfo.InvariantCulture);

            await component.DeferAsync().ConfigureAwait(false);

            if (await _client.GetChannelAsync(component.ChannelId!.Value).ConfigureAwait(false) is SocketGuildChannel guildChannel)
            {
                V2MessageBuilder preview = state.IsSent
                    ? BuildSentPreviewPayload(state, guildChannel.Guild)
                    : BuildPreviewPayload(state, guildChannel.Guild);
                await _v2Client.EditMessageAsync(component.ChannelId!.Value, component.Message.Id, preview).ConfigureAwait(false);
            }
        }

        private async Task HandleAiImproveAsync(SocketMessageComponent component)
        {
            try
            {
                if (!IssueStateCache.TryGet(component.User.Id, out IssueState? state) || state is null)
                {
                    await component.RespondAsync("This is not your issue template.", ephemeral: true).ConfigureAwait(false);
                    return;
                }

                if (!AiImproveService.IsEnabled)
                {
                    await component.RespondAsync("AI improve is not available — HF_TOKEN is not configured.", ephemeral: true).ConfigureAwait(false);
                    return;
                }

                await component.DeferAsync().ConfigureAwait(false);

                string? improved = await AiImproveService.ImproveAsync(state.Title, state.Description).ConfigureAwait(false);
                if (string.IsNullOrWhiteSpace(improved))
                {
                    await component.FollowupAsync("AI improvement failed. Please try again later.", ephemeral: true).ConfigureAwait(false);
                    return;
                }

                state.Description = improved;

                if (await _client.GetChannelAsync(component.ChannelId!.Value).ConfigureAwait(false) is SocketGuildChannel guildChannel)
                {
                    V2MessageBuilder preview = BuildPreviewPayload(state, guildChannel.Guild);
                    await _v2Client.EditMessageAsync(component.ChannelId!.Value, component.Message.Id, preview).ConfigureAwait(false);
                }
            }
            catch (HttpRequestException ex)
            {
                Logger.Error($"[ISSUE] AI improve failed: {ex.Message}", ex);
                try
                {
                    await component.FollowupAsync("AI improve failed — could not reach the AI service.", ephemeral: true).ConfigureAwait(false);
                }
                catch (global::Discord.Net.HttpException)
                {
                }
                catch (InvalidOperationException)
                {
                }
                catch (TimeoutException)
                {
                }
            }
            catch (InvalidOperationException ex)
            {
                Logger.Error($"[ISSUE] AI improve failed: {ex.Message}", ex);
            }
            catch (TaskCanceledException ex)
            {
                Logger.Error($"[ISSUE] AI improve timed out: {ex.Message}", ex);
            }
        }

        private async Task HandleSendAsync(SocketMessageComponent component)
        {
            if (!IssueStateCache.TryGet(component.User.Id, out IssueState? state) || state is null)
            {
                await component.RespondAsync("This is not your issue template.", ephemeral: true).ConfigureAwait(false);
                return;
            }

            if (state.ChannelId is null)
            {
                await component.RespondAsync("Please select a channel first.", ephemeral: true).ConfigureAwait(false);
                return;
            }

            await component.DeferAsync().ConfigureAwait(false);

            IChannel rawChannel = await _client.GetChannelAsync(state.ChannelId.Value).ConfigureAwait(false);
            if (rawChannel is not ITextChannel channel)
            {
                await component.FollowupAsync("Channel not found. It may have been deleted.", ephemeral: true).ConfigureAwait(false);
                return;
            }

            V2MessageBuilder sentPayload = BuildSentPayload(state);

            ulong? sentMessageId = null;
            try
            {
                sentMessageId = await _v2Client.SendMessageAsync(channel.Id, sentPayload).ConfigureAwait(false);
            }
            catch (HttpRequestException ex)
            {
                Logger.Error($"[ISSUE] Failed to send issue to channel: {ex.Message}", ex);
            }
            catch (global::Discord.Net.HttpException ex)
            {
                Logger.Error($"[ISSUE] Failed to send issue to channel: {ex.Message}", ex);
            }

            if (sentMessageId is null)
            {
                await component.FollowupAsync("Failed to send issue. Check that the bot has permissions in the target channel.", ephemeral: true).ConfigureAwait(false);
                return;
            }

            state.SentChannelId = channel.Id;
            state.SentMessageId = sentMessageId.Value;
            state.PreviewMessageId = component.Message.Id;

            if (await _client.GetChannelAsync(component.ChannelId!.Value).ConfigureAwait(false) is SocketGuildChannel guildChannel)
            {
                V2MessageBuilder sentPreview = BuildSentPreviewPayload(state, guildChannel.Guild);
                await _v2Client.EditMessageAsync(component.ChannelId!.Value, component.Message.Id, sentPreview).ConfigureAwait(false);
            }
        }

        private static async Task HandleEditAsync(SocketMessageComponent component)
        {
            if (!IssueStateCache.TryGet(component.User.Id, out IssueState? state) || state is null)
            {
                await component.RespondAsync("No issue to edit.", ephemeral: true).ConfigureAwait(false);
                return;
            }

            string modalCustomId = $"issue_edit_modal_{component.User.Id}";

            await new Components.V2.ModalBuilder()
                .WithCustomId(modalCustomId)
                .WithTitle("Edit Issue")
                .AddTextInput("Title", "issue_edit_title", defaultValue: state.Title, minLength: 1, maxLength: 256)
                .AddTextInput("Description", "issue_edit_description", defaultValue: state.Description, style: Components.V2.TextInputStyle.Paragraph, minLength: 1, maxLength: 4000)
                .SendAsync(component).ConfigureAwait(false);
        }

        private static V2MessageBuilder BuildSentPayload(IssueState state)
        {
            Components.V2.ContainerBuilder container = new Components.V2.ContainerBuilder()
                .WithAccentColor(0x1E90FF)
                .AddComponent(new Components.V2.TextDisplayBuilder().WithContent($"# {state.Title}\n\n{state.Description}"));

            V2MessageBuilder builder = new();

            if (state.RoleId.HasValue)
            {
                builder.AddComponent(new Components.V2.TextDisplayBuilder().WithContent($"<@&{state.RoleId.Value}>"));
            }

            builder.AddComponent(container);
            return builder;
        }

        private static V2MessageBuilder BuildPreviewPayload(IssueState state, SocketGuild guild)
        {
            string channelName = "Not selected";
            if (state.ChannelId.HasValue)
            {
                channelName = guild.GetChannel(state.ChannelId.Value) is ITextChannel ch
                    ? $"#{ch.Name}"
                    : "#deleted-channel";
            }

            string roleName = "No role";
            if (state.RoleId.HasValue)
            {
                roleName = guild.GetRole(state.RoleId.Value) is SocketRole role
                    ? $"@{role.Name}"
                    : "@deleted-role";
            }

            string descriptionPreview = state.Description.Length > 500
                ? state.Description[..500] + "..."
                : state.Description;

            Components.V2.ContainerBuilder container = new Components.V2.ContainerBuilder()
                .WithAccentColor(0x1E90FF)
                .AddComponent(new Components.V2.TextDisplayBuilder().WithContent($"**{state.Title}**\n\n{descriptionPreview}"))
                .AddComponent(new Components.V2.SeparatorBuilder().WithSpacing(SeparatorSpacing.Small))
                .AddComponent(new Components.V2.TextDisplayBuilder().WithContent($"**Channel:** {channelName}\n**Role:** {roleName}"));

            List<SocketTextChannel> channels = [..guild.TextChannels
                .OrderBy(ch => ch.Position)
                .Take(25)];

            Components.V2.SelectMenuBuilder channelMenu = new Components.V2.SelectMenuBuilder()
                .WithCustomId("issue_channel_select")
                .WithPlaceholder("Select a channel...")
                .WithMinValues(1)
                .WithMaxValues(1)
                .AddOption("No channel", "none", "Don't send to a channel");

            foreach (SocketTextChannel ch in channels)
            {
                channelMenu.AddOption($"#{ch.Name}", ch.Id.ToString(CultureInfo.InvariantCulture), $"Send to #{ch.Name}");
            }

            container.AddComponent(new Components.V2.ActionRowBuilder().AddComponent(channelMenu));

            List<SocketRole> roles = [..guild.Roles
                .Where(r => !r.IsEveryone && !r.IsManaged)
                .OrderBy(r => r.Position)
                .Take(25)];

            Components.V2.SelectMenuBuilder roleMenu = new Components.V2.SelectMenuBuilder()
                .WithCustomId("issue_role_select")
                .WithPlaceholder("Select a role to ping...")
                .WithMinValues(1)
                .WithMaxValues(1)
                .AddOption("No role", "none", "Don't ping anyone");

            foreach (SocketRole role in roles)
            {
                roleMenu.AddOption($"@{role.Name}", role.Id.ToString(CultureInfo.InvariantCulture), $"Ping @{role.Name}");
            }

            container.AddComponent(new Components.V2.ActionRowBuilder().AddComponent(roleMenu));

            container.AddComponent(new Components.V2.SeparatorBuilder().WithSpacing(SeparatorSpacing.Small));
            container.AddComponent(new Components.V2.SectionBuilder()
                .AddTextDisplay(new Components.V2.TextDisplayBuilder().WithContent("Edit the issue title and description"))
                .WithButtonAccessory("Edit Issue", $"issue_edit_{state.AuthorId}"));
            container.AddComponent(new Components.V2.SectionBuilder()
                .AddTextDisplay(new Components.V2.TextDisplayBuilder().WithContent("Use **AI Improve** to enhance your description with AI, then **Send** to publish."))
                .WithButtonAccessory("AI Improve", "issue_ai_improve"));
            container.AddComponent(new Components.V2.SectionBuilder()
                .AddTextDisplay(new Components.V2.TextDisplayBuilder().WithContent("Publish the issue to the selected channel"))
                .WithButtonAccessory("Send Issue", "issue_send"));

            V2MessageBuilder builder = new V2MessageBuilder().AddComponent(container);
            return builder;
        }

        private static V2MessageBuilder BuildSentPreviewPayload(IssueState state, SocketGuild guild)
        {
            string channelName = "Not selected";
            if (state.ChannelId.HasValue)
            {
                channelName = guild.GetChannel(state.ChannelId.Value) is ITextChannel ch
                    ? $"#{ch.Name}"
                    : "#deleted-channel";
            }

            string roleName = "No role";
            if (state.RoleId.HasValue)
            {
                roleName = guild.GetRole(state.RoleId.Value) is SocketRole role
                    ? $"@{role.Name}"
                    : "@deleted-role";
            }

            Components.V2.ContainerBuilder container = new Components.V2.ContainerBuilder()
                .WithAccentColor(0x2ECC71)
                .AddComponent(new Components.V2.TextDisplayBuilder().WithContent($"# {state.Title}\n\n{state.Description}"))
                .AddComponent(new Components.V2.SeparatorBuilder().WithSpacing(SeparatorSpacing.Small))
                .AddComponent(new Components.V2.TextDisplayBuilder().WithContent($"**Channel:** {channelName}\n**Role:** {roleName}\n**Status:** Sent"))
                .AddComponent(new Components.V2.SeparatorBuilder().WithSpacing(SeparatorSpacing.Small))
                .AddComponent(new Components.V2.SectionBuilder()
                    .AddTextDisplay(new Components.V2.TextDisplayBuilder().WithContent("Edit the issue that was sent"))
                    .WithButtonAccessory("Edit Issue", $"issue_edit_{state.AuthorId}"));

            return new V2MessageBuilder().AddComponent(container);
        }
    }
}
