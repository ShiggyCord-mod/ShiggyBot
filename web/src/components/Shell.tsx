import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupsIcon from '@mui/icons-material/Groups';
import ForumIcon from '@mui/icons-material/Forum';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import type { View } from '../App';

const NAV_ITEMS: Array<{ key: View; label: string; icon: ReactNode }> = [
  { key: 'overview', label: 'Overview', icon: <DashboardIcon /> },
  { key: 'guilds', label: 'Guilds', icon: <GroupsIcon /> },
  { key: 'chat', label: 'Chat', icon: <ForumIcon /> },
];

const DRAWER_WIDTH = 240;

interface ShellProps {
  view: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  children: ReactNode;
}

export function Shell({ view, onNavigate, onLogout, children }: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (key: View) => {
    onNavigate(key);
    setMobileOpen(false);
  };

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <List sx={{ p: 1.5, flex: 1 }}>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.key}
            selected={view === item.key}
            onClick={() => nav(item.key)}
            sx={{ mb: 0.5 }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                color: view === item.key ? 'onPrimaryContainer' : 'text.secondary',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 1.5 }}>
        <ListItemButton onClick={onLogout} sx={{ color: 'text.secondary' }}>
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Log out" />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          color: 'text.primary',
          bgcolor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
        elevation={0}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            edge="start"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2.5,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'primaryContainer',
                color: 'onPrimaryContainer',
                fontWeight: 800,
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              S
            </Box>
            <Typography variant="h6">ShiggyBot</Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Log out">
            <IconButton aria-label="Log out" onClick={onLogout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {content}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
        >
          {content}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, lg: 4 },
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
