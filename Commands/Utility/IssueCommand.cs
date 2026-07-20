using Discord.WebSocket;
using ShiggyBot.Components.V2;
using ShiggyBot.Services;
using ShiggyBot.Utils;

namespace ShiggyBot.Commands.Utility
{
    /// <summary>
    /// Command to create and send an issue template to a chosen channel with optional AI improvement.
    /// </summary>
    internal sealed class IssueCommand : ICommand
    {
        private readonly ComponentsV2Client _v2Client;

        /// <summary>
        /// Initializes a new instance of the <see cref="IssueCommand"/> class.
        /// </summary>
        /// <param name="v2Client">The Components V2 client.</param>
        internal IssueCommand(ComponentsV2Client v2Client)
        {
            ArgumentNullException.ThrowIfNull(v2Client);
            _v2Client = v2Client;
        }

        /// <summary>Gets the command name.</summary>
        public string Name => "issue";

        /// <summary>Gets the command description.</summary>
        public string Description => "Create and send an issue template to a channel";

        /// <summary>Gets the command category.</summary>
        public string Category => "Utility";

        /// <summary>Gets the command aliases.</summary>
        public IReadOnlyList<string> Aliases => ["issues", "ticket"];

        /// <summary>Executes the command.</summary>
        public async Task ExecuteAsync(SocketUserMessage message, string[] args, DiscordSocketClient client)
        {
            ArgumentNullException.ThrowIfNull(message);

            if (!await PermissionHelper.RequireAdminAsync(message).ConfigureAwait(false))
            {
                return;
            }

            string buttonCustomId = $"issue_create_{message.Author.Id}";
            string modalCustomId = $"issue_modal_{message.Author.Id}";

            EphemeralButtonService.Register(buttonCustomId, async (component) =>
            {
                await new ModalBuilder()
                    .WithCustomId(modalCustomId)
                    .WithTitle("Create Issue Template")
                    .AddTextInput("Title", "issue_title", placeholder: "Enter issue title...", minLength: 1, maxLength: 256)
                    .AddTextInput("Description", "issue_description", placeholder: "Describe the issue in detail...", style: TextInputStyle.Paragraph, minLength: 1, maxLength: 4000)
                    .SendAsync(component).ConfigureAwait(false);

                try
                {
                    await component.Message.DeleteAsync().ConfigureAwait(false);
                }
                catch (global::Discord.Net.HttpException)
                {
                }
                catch (InvalidOperationException)
                {
                }
            });

            V2MessageBuilder builder = new V2MessageBuilder()
                .AddComponent(new ContainerBuilder()
                    .WithAccentColor(0x1E90FF)
                    .AddComponent(new TextDisplayBuilder().WithContent("# Issue Template Creator\n\nClick below to create a new issue. You can choose a target channel, ping a role, and optionally use AI to polish your description."))
                    .AddComponent(new SeparatorBuilder().WithSpacing(SeparatorSpacing.Small))
                    .AddComponent(new SectionBuilder()
                        .AddTextDisplay(new TextDisplayBuilder().WithContent("Ready to create an issue?"))
                        .WithButtonAccessory("Create Issue", buttonCustomId)));

            await _v2Client.SendMessageAsync(message.Channel.Id, builder).ConfigureAwait(false);
        }
    }
}
