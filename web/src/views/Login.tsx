import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { ApiError, setToken } from '../api';

interface LoginViewProps {
  onLogin: (token: string) => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!value.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const probe = await fetch('/api/status', {
        headers: { Authorization: `Bearer ${value.trim()}` },
      });
      if (!probe.ok) throw new ApiError(probe.status, 'Invalid token');
      setToken(value.trim());
      onLogin(value.trim());
    } catch (err) {
      setError(err instanceof ApiError ? 'Invalid dashboard token' : 'Could not reach the bot');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: '100%',
          maxWidth: 400,
          p: { xs: 3, sm: 5 },
          borderRadius: 4,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 3,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primaryContainer',
            color: 'onPrimaryContainer',
            mb: 2.5,
          }}
        >
          <LockIcon />
        </Box>
        <Typography variant="h5" sx={{ mb: 0.5 }}>
          ShiggyBot Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter the dashboard token from your bot's <code>DASHBOARD_TOKEN</code> environment
          variable.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Dashboard token"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          fullWidth
          required
          autoFocus
          autoComplete="off"
          sx={{ mb: 2 }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={show ? 'Hide token' : 'Show token'}
                    edge="end"
                    onClick={() => setShow((prev) => !prev)}
                  >
                    {show ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
          {loading ? 'Connecting…' : 'Connect'}
        </Button>
      </Box>
    </Box>
  );
}
