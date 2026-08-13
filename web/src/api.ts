import type { ApiChannel, ApiCommand, ApiGuild, ApiMessage, ApiStatus } from './types';

const TOKEN_KEY = 'shiggy_dashboard_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...init,
    headers,
  });

  if (res.status === 401) throw new ApiError(401, 'Unauthorized');
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      message = body.error ?? message;
    } catch {
      // keep statusText
    }
    throw new ApiError(res.status, message);
  }

  return (await res.json()) as T;
}

export const api = {
  status: () => request<ApiStatus>('/api/status'),
  guilds: () => request<ApiGuild[]>('/api/guilds'),
  guild: (guildId: string) => request<ApiGuild>(`/api/guilds/${guildId}`),
  channels: (guildId: string) => request<ApiChannel[]>(`/api/guilds/${guildId}/channels`),
  messages: (guildId: string, channelId: string, limit = 50, before?: string) =>
    request<ApiMessage[]>(
      `/api/guilds/${guildId}/messages?channelId=${channelId}&limit=${limit}${
        before ? `&before=${before}` : ''
      }`
    ),
  sendMessage: (guildId: string, channelId: string, content: string) =>
    request<ApiMessage>(`/api/guilds/${guildId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ channelId, content }),
    }),
  commands: (guildId: string) => request<ApiCommand[]>(`/api/guilds/${guildId}/commands`),
  setCommandDisabled: (guildId: string, command: string, disabled: boolean) =>
    request<{ ok: boolean }>(`/api/guilds/${guildId}/commands/${command}/${disabled ? 'disable' : 'enable'}`, {
      method: 'POST',
    }),
};

export function connectSocket(): WebSocket {
  const token = getToken();
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const url = token
    ? `${protocol}://${location.host}/ws?token=${encodeURIComponent(token)}`
    : `${protocol}://${location.host}/ws`;

  return new WebSocket(url);
}
