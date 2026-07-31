import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Switch,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { api, ApiError } from '../api';
import type { ApiChannel, ApiCommand, ApiGuild } from '../types';
import { formatNumber } from '../format';

function GuildIcon({ guild, size = 56 }: { guild: ApiGuild; size?: number }) {
  return (
    <Avatar src={guild.iconUrl ?? undefined} sx={{ width: size, height: size, bgcolor: 'primaryContainer' }}>
      {guild.name[0]?.toUpperCase()}
    </Avatar>
  );
}

function GuildDetailDialog({ guild, onClose }: { guild: ApiGuild; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const [channels, setChannels] = useState<ApiChannel[] | null>(null);
  const [commands, setCommands] = useState<ApiCommand[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setChannels(null);
    setCommands(null);
    api
      .channels(guild.id)
      .then(setChannels)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load channels'));
    api
      .commands(guild.id)
      .then(setCommands)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load commands'));
  }, [guild.id]);

  async function toggleCommand(command: ApiCommand, disabled: boolean): Promise<void> {
    setCommands((prev) =>
      prev ? prev.map((cmd) => (cmd.name === command.name ? { ...cmd, disabled } : cmd)) : prev
    );
    try {
      await api.setCommandDisabled(guild.id, command.name, disabled);
    } catch (err) {
      setCommands((prev) =>
        prev ? prev.map((cmd) => (cmd.name === command.name ? { ...cmd, disabled: !disabled } : cmd)) : prev
      );
      setError(err instanceof ApiError ? err.message : 'Failed to update command');
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, pr: 6 }}>
        <GuildIcon guild={guild} size={40} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
            {guild.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatNumber(guild.memberCount)} members
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <IconButton
          onClick={onClose}
          aria-label="Close"
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Tabs
          value={tab}
          onChange={(_event, value: number) => setTab(value)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}
        >
          <Tab label="Channels" />
          <Tab label="Commands" />
        </Tabs>

        {tab === 0 &&
          (channels === null ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : channels.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No channels to show.
            </Typography>
          ) : (
            <List disablePadding>
              {channels.map((channel, index) => (
                <Box key={channel.id}>
                  {index > 0 && <Divider component="li" />}
                  <ListItem sx={{ px: 1 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" component="span">
                            # {channel.name}
                          </Typography>
                          {channel.nsfw && (
                            <Chip size="small" label="NSFW" color="warning" variant="outlined" />
                          )}
                        </Box>
                      }
                      secondary={channel.topic ?? `${channel.type} channel`}
                      slotProps={{
                        primary: { noWrap: true },
                        secondary: { noWrap: true },
                      }}
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          ))}

        {tab === 1 &&
          (commands === null ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : commands.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No commands to show.
            </Typography>
          ) : (
            <List disablePadding>
              {commands.map((command, index) => (
                <Box key={command.name}>
                  {index > 0 && <Divider component="li" />}
                  <ListItem
                    sx={{ px: 1 }}
                    secondaryAction={
                      <Switch
                        edge="end"
                        checked={!command.disabled}
                        onChange={(event) => void toggleCommand(command, !event.target.checked)}
                      />
                    }
                  >
                    <ListItemText
                      primary={command.name}
                      secondary={command.description || command.category}
                      slotProps={{
                        primary: { sx: { fontWeight: 600 } },
                        secondary: { noWrap: true },
                      }}
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          ))}
      </DialogContent>
    </Dialog>
  );
}

export function GuildsView() {
  const [guilds, setGuilds] = useState<ApiGuild[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApiGuild | null>(null);

  useEffect(() => {
    api
      .guilds()
      .then(setGuilds)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load guilds'));
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Guilds
        </Typography>
        {guilds && (
          <Typography variant="body2" color="text.secondary">
            {guilds.length}
          </Typography>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Servers the bot is connected to
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {!guilds && !error && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      )}
      {guilds && guilds.length === 0 && (
        <Alert severity="info">The bot is not in any servers yet.</Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
        {guilds?.map((guild) => (
          <Card key={guild.id}>
            <CardActionArea onClick={() => setSelected(guild)} sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <GuildIcon guild={guild} size={48} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                    {guild.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatNumber(guild.memberCount)} members
                  </Typography>
                </Box>
                <ChevronRightIcon sx={{ color: 'text.disabled' }} />
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      {selected && <GuildDetailDialog guild={selected} onClose={() => setSelected(null)} />}
    </Box>
  );
}
