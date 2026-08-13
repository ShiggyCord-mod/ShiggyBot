import { createHash, timingSafeEqual } from 'crypto';

function digest(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

export function extractBearer(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match ? match[1] : null;
}

export function isAuthorized(token: string | null, expected: string): boolean {
  if (!token) return false;
  const a = digest(token);
  const b = digest(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
