import type { Socket } from 'socket.io';
import cookie from 'cookie';

export function extractSessionId(socket: Socket): string | null {
  // Check socket.io auth param first (cross-origin)
  if (socket.handshake.auth?.sessionId) {
    return socket.handshake.auth.sessionId;
  }
  // Fall back to cookie (same-origin)
  const cookies = socket.handshake.headers.cookie;
  if (!cookies) return null;
  const parsed = cookie.parse(cookies);
  return parsed.sid || null;
}
