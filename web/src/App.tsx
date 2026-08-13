import { useState } from 'react';
import { Shell } from './components/Shell';
import { clearToken, getToken } from './api';
import { LoginView } from './views/Login';
import { OverviewView } from './views/Overview';
import { GuildsView } from './views/Guilds';
import { ChatView } from './views/Chat';

export type View = 'overview' | 'guilds' | 'chat';

export default function App() {
  const [token, setToken] = useState<string | null>(() => getToken());
  const [view, setView] = useState<View>('overview');

  if (!token) {
    return <LoginView onLogin={() => setToken(getToken())} />;
  }

  function handleLogout(): void {
    clearToken();
    setToken(null);
    setView('overview');
  }

  return (
    <Shell view={view} onNavigate={setView} onLogout={handleLogout}>
      {view === 'overview' && <OverviewView />}
      {view === 'guilds' && <GuildsView />}
      {view === 'chat' && <ChatView />}
    </Shell>
  );
}
