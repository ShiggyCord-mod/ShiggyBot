import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SendIcon from '@mui/icons-material/Send';
import { api, ApiError, connectSocket } from '../api';
import type { ApiAttachment, ApiChannel, ApiEmbed, ApiGuild, ApiMessage, WsEvent } from '../types';
import { formatNumber, formatTime, timeAgo } from '../format';

const PAGE_SIZE = 50;

function EmbedContent({ embed }: { embed: ApiEmbed }) {
  const color = embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : 'primary.main';

  return (
    <Box
      sx={{
        mt: 0.75,
        p: 1.5,
        borderRadius: 2,
        bgcolor: 'surfaceContainerLow',
        borderLeft: 4,
        borderColor: color,
      }}
    >
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {embed.title && (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {embed.url ? (
                <a href={embed.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                  {embed.title}
                </a>
              ) : (
                embed.title
              )}
            </Typography>
          )}
          {embed.description && (
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {embed.description}
            </Typography>
          )}
        </Box>
        {embed.thumbnail && (
          <img
            src={embed.thumbnail.url}
            alt=""
            loading="lazy"
            style={{
              maxWidth: 120,
              maxHeight: 120,
              borderRadius: 8,
              flexShrink: 0,
            }}
          />
        )}
      </Box>
      {embed.image && (
        <img
          src={embed.image.url}
          alt=""
          loading="lazy"
          style={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: 320,
            borderRadius: 8,
            marginTop: 8,
          }}
        />
      )}
    </Box>
  );
}

function AttachmentMedia({ attachment }: { attachment: ApiAttachment }) {
  const type = attachment.contentType ?? '';

  if (type.startsWith('image/')) {
    return (
      <Box
        component="a"
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        sx={{ display: 'block', mt: 1 }}
      >
        <img
          src={attachment.url}
          alt={attachment.name}
          loading="lazy"
          style={{ display: 'block', maxWidth: '100%', maxHeight: 320, borderRadius: 8 }}
        />
      </Box>
    );
  }

  if (type.startsWith('video/')) {
    return (
      <Box component="video" src={attachment.url} controls sx={{ display: 'block', mt: 1 }} />
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
      <AttachFileIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
      <Typography variant="body2">
        <a href={attachment.url} target="_blank" rel="noreferrer">
          {attachment.name}
        </a>
      </Typography>
    </Box>
  );
}

function MessageRow({ message }: { message: ApiMessage }) {
  return (
    <Box
      data-mid={message.id}
      sx={{
        display: 'flex',
        gap: 1.75,
        mx: 1.5,
        px: 1.5,
        py: 1.5,
        borderRadius: 2,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Avatar
        src={message.author.avatarUrl ?? undefined}
        sx={{ width: 40, height: 40, mt: 0.25, bgcolor: 'primaryContainer' }}
      >
        {message.author.displayName[0]?.toUpperCase()}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.25 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {message.author.displayName}
          </Typography>
          {message.author.bot && (
            <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
              BOT
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {formatTime(message.createdTimestamp)} · {timeAgo(message.createdTimestamp)}
          </Typography>
        </Box>
        {message.content && (
          <Typography
            variant="body2"
            sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.55 }}
          >
            {message.content}
          </Typography>
        )}
        {message.embeds.map((embed, index) => (
          <EmbedContent key={index} embed={embed} />
        ))}
        {message.attachments.map((attachment) => (
          <AttachmentMedia key={attachment.url} attachment={attachment} />
        ))}
      </Box>
    </Box>
  );
}

export function ChatView() {
  const [guilds, setGuilds] = useState<ApiGuild[] | null>(null);
  const [channels, setChannels] = useState<ApiChannel[] | null>(null);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingScrollRef = useRef(false);
  const prevFirstIdRef = useRef<string | null>(null);
  const anchorOffsetRef = useRef(0);

  useEffect(() => {
    api
      .guilds()
      .then(setGuilds)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load guilds'));
  }, []);

  useEffect(() => {
    if (!guildId) {
      setChannels(null);
      setChannelId(null);
      return;
    }
    setChannels(null);
    setChannelId(null);
    api
      .channels(guildId)
      .then(setChannels)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load channels'));
  }, [guildId]);

  useEffect(() => {
    if (!guildId || !channelId) {
      setMessages([]);
      setHasMore(false);
      return;
    }
    setError(null);
    setHasMore(true);
    pendingScrollRef.current = true;
    api
      .messages(guildId, channelId, PAGE_SIZE)
      .then((data) => {
        setMessages(data);
        setHasMore(data.length >= PAGE_SIZE);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load messages'));
  }, [guildId, channelId]);

  useEffect(() => {
    if (!channelId) return;
    const ws = connectSocket();
    ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', channelId }));
    ws.onmessage = (event) => {
      const evt = JSON.parse(event.data as string) as WsEvent;
      if (evt.data.channelId !== channelId) return;
      if (evt.type === 'messageCreate') {
        setMessages((prev) => [...prev, evt.data as ApiMessage]);
        const el = scrollRef.current;
        const nearBottom = el
          ? el.scrollHeight - el.scrollTop - el.clientHeight < 160
          : true;
        if (nearBottom) pendingScrollRef.current = true;
      } else if (evt.type === 'messageDelete') {
        const deletedId = (evt.data as { id: string }).id;
        setMessages((prev) => prev.filter((message) => message.id !== deletedId));
      }
    };
    ws.onerror = () => {
      // socket will close; handled by onclose
    };
    return () => ws.close();
  }, [channelId]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (pendingScrollRef.current) {
      pendingScrollRef.current = false;
      el.scrollTop = el.scrollHeight;
      prevFirstIdRef.current = messages[0]?.id ?? null;
    } else if (prevFirstIdRef.current && messages[0]?.id !== prevFirstIdRef.current) {
      // Older messages were prepended — keep the previously-first message pinned.
      const anchor = el.querySelector(`[data-mid="${prevFirstIdRef.current}"]`);
      if (anchor instanceof HTMLElement) {
        el.scrollTop = anchor.offsetTop + anchorOffsetRef.current;
      }
    }
    prevFirstIdRef.current = messages[0]?.id ?? null;

    const first = el.querySelector('[data-mid]');
    if (first instanceof HTMLElement) {
      anchorOffsetRef.current = el.scrollTop - first.offsetTop;
    }
  }, [messages]);

  async function loadOlder(): Promise<void> {
    if (!guildId || !channelId || messages.length === 0 || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const older = await api.messages(guildId, channelId, PAGE_SIZE, messages[0].id);
      if (older.length === 0) {
        setHasMore(false);
        return;
      }
      setMessages((prev) => [...older, ...prev]);
      if (older.length < PAGE_SIZE) setHasMore(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load earlier messages');
    } finally {
      setLoadingOlder(false);
    }
  }

  async function handleSend(): Promise<void> {
    if (!guildId || !channelId || !draft.trim() || sending) return;
    setSending(true);
    try {
      await api.sendMessage(guildId, channelId, draft);
      setDraft('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  const selectedChannel = channels?.find((channel) => channel.id === channelId);
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('md'));
  const mobilePane: 'guilds' | 'channels' | 'messages' = isMobile
    ? channelId
      ? 'messages'
      : guildId
        ? 'channels'
        : 'guilds'
    : 'guilds';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100dvh - 128px)',
        minHeight: 520,
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
        Chat
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Live view of Discord chats — pick a server and channel
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {(!isMobile || mobilePane === 'guilds') && (
          <Box
            sx={{
              width: isMobile ? '100%' : 240,
              flex: isMobile ? '1 1 auto' : '0 0 auto',
              borderRight: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {guilds === null ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={24} />
              </Box>
            ) : guilds.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2.5 }}>
                No guilds to show.
              </Typography>
            ) : (
              <List disablePadding sx={{ p: 1.5 }}>
                {guilds.map((guild) => (
                  <ListItemButton
                    key={guild.id}
                    selected={guild.id === guildId}
                    onClick={() => setGuildId(guild.id)}
                    sx={{ borderRadius: 1.5, mb: 0.5, px: 1.5, py: 1 }}
                  >
                    <ListItemText
                      primary={guild.name}
                      secondary={`${formatNumber(guild.memberCount)} members`}
                      slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        )}

        {(!isMobile || mobilePane === 'channels') && (
          <Box
            sx={{
              width: isMobile ? '100%' : 220,
              flex: isMobile ? '1 1 auto' : '0 0 auto',
              borderRight: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {isMobile && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1,
                  py: 0.75,
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => setGuildId(null)}
                  aria-label="Back to servers"
                >
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, minWidth: 0 }} noWrap>
                  {guilds?.find((g) => g.id === guildId)?.name ?? 'Channels'}
                </Typography>
              </Box>
            )}
            {guildId ? (
              channels === null ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : channels.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2.5 }}>
                  No channels to show.
                </Typography>
              ) : (
                <List disablePadding sx={{ p: 1.5 }}>
                  {channels.map((channel) => (
                    <ListItemButton
                      key={channel.id}
                      selected={channel.id === channelId}
                      onClick={() => setChannelId(channel.id)}
                      sx={{ borderRadius: 1.5, mb: 0.5, px: 1.5, py: 1 }}
                    >
                      <ListItemText
                        primary={`# ${channel.name}`}
                        secondary={channel.topic ?? undefined}
                        slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2.5 }}>
                Select a guild
              </Typography>
            )}
          </Box>
        )}

        {(!isMobile || mobilePane === 'messages') && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2.5,
                py: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'surfaceContainerLow',
                minWidth: 0,
              }}
            >
              {isMobile && (
                <IconButton
                  size="small"
                  onClick={() => setChannelId(null)}
                  aria-label="Back to channels"
                  sx={{ ml: -1.5 }}
                >
                  <ArrowBackIcon />
                </IconButton>
              )}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, minWidth: 0 }} noWrap>
                {selectedChannel ? `# ${selectedChannel.name}` : 'No channel selected'}
              </Typography>
            </Box>

          <Box ref={scrollRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {channelId && messages.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
                {loadingOlder ? (
                  <CircularProgress size={24} />
                ) : (
                  hasMore && (
                    <Button
                      size="small"
                      startIcon={<ExpandLessIcon />}
                      onClick={() => void loadOlder()}
                      sx={{ textTransform: 'none' }}
                    >
                      Load earlier messages
                    </Button>
                  )
                )}
              </Box>
            )}

            {messages.length === 0 && channelId ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
                No messages in this channel yet.
              </Typography>
            ) : (
              messages.map((message) => <MessageRow key={message.id} message={message} />)
            )}

            {!channelId && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 8 }}
              >
                Select a guild and channel to start reading.
              </Typography>
            )}
          </Box>

          <Paper
            component="form"
            elevation={0}
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'flex-end',
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
            }}
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
          >
            <TextField
              fullWidth
              multiline
              minRows={1}
              maxRows={4}
              placeholder="Message the channel…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!channelId}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
            />
            <Tooltip title="Send">
              <span>
                <IconButton
                  type="submit"
                  color="primary"
                  disabled={!channelId || !draft.trim() || sending}
                  aria-label="Send message"
                >
                  <SendIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Paper>
          </Box>
        )}
      </Card>
    </Box>
  );
}
