import { existsSync, statSync } from 'fs';
import { extname, join, resolve } from 'path';
import type { BotClient } from '@bot/client.js';
import { logger } from '@logger/index.js';
import type { DashboardOptions } from '@dtypes/dashboard';
import { extractBearer, isAuthorized } from './auth.js';
import {
  ApiError,
  getGuild,
  getMessages,
  getStatus,
  listChannels,
  listCommands,
  listGuilds,
  sendMessage,
  setCommandDisabled,
} from './api.js';
import { SubscriptionHub } from './ws.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://cdn.discordapp.com",
  "connect-src 'self'",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function staticHeaders(contentType: string): Headers {
  const headers = new Headers({ 'Content-Type': contentType });
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Content-Security-Policy', CSP);
  return headers;
}

function serveStatic(pathname: string, webDir: string): Response {
  const root = resolve(webDir);
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).slice(1);
  const filePath = resolve(root, rel);

  if (!filePath.startsWith(root)) return new Response('Not Found', { status: 404 });

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath).toLowerCase();
    // eslint-disable-next-line security/detect-object-injection
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
    return new Response(Bun.file(filePath), { headers: staticHeaders(contentType) });
  }

  const index = join(root, 'index.html');
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (existsSync(index))
    return new Response(Bun.file(index), { headers: staticHeaders('text/html; charset=utf-8') });
  return new Response(UI_NOT_BUILT_HTML, {
    status: 200,
    headers: staticHeaders('text/html; charset=utf-8'),
  });
}

const UI_NOT_BUILT_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ShiggyBot Dashboard</title>
  </head>
  <body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#1e2022;color:#e6e6e6;display:grid;place-items:center;min-height:100vh">
    <div style="text-align:center;padding:24px">
      <h1 style="margin:0 0 8px">ShiggyBot Dashboard</h1>
      <p>The dashboard UI has not been built yet. The bot is building it now — refresh in a moment.</p>
      <p style="opacity:.6">For a manual build run <code>bun install && bun run build</code> inside <code>web/</code>.</p>
    </div>
  </body>
</html>`;

const AUTH_WINDOW_MS = 60_000;
const AUTH_MAX_FAILURES = 10;
const authFailures = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const entry = authFailures.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > AUTH_WINDOW_MS) {
    authFailures.delete(ip);
    return false;
  }
  return entry.count >= AUTH_MAX_FAILURES;
}

function recordAuthFailure(ip: string): void {
  const now = Date.now();
  const entry = authFailures.get(ip);
  if (!entry || now - entry.windowStart > AUTH_WINDOW_MS) {
    authFailures.set(ip, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
}

function recordAuthSuccess(ip: string): void {
  authFailures.delete(ip);
}

function isTrustedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

async function handleApi(
  client: BotClient,
  req: Request,
  url: URL,
  startedAt: number
): Promise<Response> {
  const parts = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  if (parts[0] !== 'api' || parts.length < 2) throw new ApiError(404, 'Not found');

  if (parts[1] === 'status' && method === 'GET') return jsonResponse(getStatus(client, startedAt));
  if (parts[1] === 'guilds' && parts.length === 2 && method === 'GET') {
    return jsonResponse(listGuilds(client));
  }
  if (parts[1] !== 'guilds' || parts.length < 3) throw new ApiError(404, 'Not found');

  const guildId = parts[2];

  if (parts.length === 3 && method === 'GET') return jsonResponse(getGuild(client, guildId));

  if (parts.length === 4 && parts[3] === 'channels' && method === 'GET') {
    return jsonResponse(listChannels(client, guildId));
  }

  if (parts.length === 4 && parts[3] === 'commands' && method === 'GET') {
    return jsonResponse(listCommands(client, guildId));
  }

  if (parts.length === 4 && parts[3] === 'messages') {
    if (method === 'GET') {
      const channelId = url.searchParams.get('channelId');
      if (!channelId) throw new ApiError(400, 'channelId is required');
      const limit = Number(url.searchParams.get('limit') ?? 50);
      const before = url.searchParams.get('before') ?? undefined;
      return jsonResponse(await getMessages(client, guildId, channelId, limit, before));
    }
    if (method === 'POST') {
      const body = (await req.json()) as { channelId?: string; content?: string };
      if (typeof body.channelId !== 'string') throw new ApiError(400, 'channelId is required');
      return jsonResponse(
        await sendMessage(
          client,
          guildId,
          body.channelId,
          typeof body.content === 'string' ? body.content : ''
        ),
        201
      );
    }
  }

  if (parts.length === 6 && parts[3] === 'commands' && method === 'POST') {
    const command = parts[4];
    const action = parts[5];
    if (action === 'disable') {
      setCommandDisabled(guildId, command, true);
      return jsonResponse({ ok: true });
    }
    if (action === 'enable') {
      setCommandDisabled(guildId, command, false);
      return jsonResponse({ ok: true });
    }
  }

  throw new ApiError(404, 'Not found');
}

export function createDashboardServer(
  client: BotClient,
  options: DashboardOptions,
  hub: SubscriptionHub,
  startedAt: number
) {
  return Bun.serve<{ channelIds: Set<string> }>({
    port: options.port,
    hostname: options.hostname,
    maxRequestBodySize: 64 * 1024,
    async fetch(req, server) {
      const url = new URL(req.url);
      const ip = server.requestIP(req)?.address ?? 'unknown';

      if (!isTrustedOrigin(req.headers.get('Origin'))) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      try {
        if (url.pathname === '/ws') {
          if (isRateLimited(ip)) {
            return jsonResponse({ error: 'Too many requests' }, 429);
          }
          const protocol = req.headers.get('sec-websocket-protocol');
          const token = protocol ? protocol.split(',')[0].trim() : null;
          if (!isAuthorized(token, options.token)) {
            recordAuthFailure(ip);
            return new Response('Unauthorized', { status: 401 });
          }
          recordAuthSuccess(ip);
          const upgraded = server.upgrade(req, {
            data: { channelIds: new Set<string>() },
            headers: token ? { 'Sec-WebSocket-Protocol': token } : undefined,
          });
          return upgraded ? undefined : new Response('Upgrade failed', { status: 400 });
        }

        if (url.pathname.startsWith('/api/')) {
          if (isRateLimited(ip)) {
            return jsonResponse({ error: 'Too many requests' }, 429);
          }
          const auth = extractBearer(req.headers.get('Authorization'));
          if (!isAuthorized(auth, options.token)) {
            recordAuthFailure(ip);
            return jsonResponse({ error: 'Unauthorized' }, 401);
          }
          recordAuthSuccess(ip);
          return await handleApi(client, req, url, startedAt);
        }

        return serveStatic(url.pathname, options.webDir);
      } catch (error) {
        if (error instanceof ApiError) {
          return jsonResponse({ error: error.message }, error.status);
        }
        logger.warn(`Dashboard request failed: ${(error as Error).message}`, {
          context: 'Dashboard',
        });
        return jsonResponse({ error: 'Internal server error' }, 500);
      }
    },
    websocket: {
      open(ws) {
        hub.add(ws);
      },
      message(ws, message) {
        hub.onMessage(ws, message);
      },
      close(ws) {
        hub.remove(ws);
      },
    },
  });
}
