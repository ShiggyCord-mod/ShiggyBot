import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Typography,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import ForumIcon from '@mui/icons-material/Forum';
import PeopleIcon from '@mui/icons-material/People';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import TimerIcon from '@mui/icons-material/Timer';
import { api, ApiError } from '../api';
import type { ApiStatus } from '../types';
import { formatDuration, formatNumber } from '../format';
import { StatCard } from '../components/StatCard';

function useStatus() {
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .status()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load status');
      });
    const timer = setInterval(() => {
      api
        .status()
        .then((data) => {
          if (!cancelled) setStatus(data);
        })
        .catch(() => {
          // keep last known status
        });
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { status, error };
}

export function OverviewView() {
  const { status, error } = useStatus();

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  if (!status) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
        Overview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Live status of the bot
      </Typography>

      {status.user && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={status.user.avatarUrl ?? undefined}
              sx={{ width: 64, height: 64, bgcolor: 'primaryContainer' }}
            >
              {status.user.username[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
                {status.user.globalName ?? status.user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                @{status.user.username}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            <Chip
              label={status.presence}
              color={status.presence === 'online' ? 'success' : 'default'}
              variant="outlined"
            />
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
        <StatCard label="Guilds" value={formatNumber(status.guilds)} icon={<GroupsIcon />} />
        <StatCard label="Channels" value={formatNumber(status.channels)} icon={<ForumIcon />} />
        <StatCard label="Members" value={formatNumber(status.members)} icon={<PeopleIcon />} />
        <StatCard label="Gateway ping" value={`${Math.round(status.ping)} ms`} icon={<NetworkCheckIcon />} />
        <StatCard label="Bot uptime" value={formatDuration(status.uptime)} icon={<TimerIcon />} />
        <StatCard label="Dashboard uptime" value={formatDuration(status.dashboardUptime)} icon={<TimerIcon />} />
      </Box>
    </Box>
  );
}
