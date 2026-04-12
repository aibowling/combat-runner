import { io, Socket } from 'socket.io-client';
import { useStore } from './store';
import { S2C, type HelloPayload, type HelloAck, type StateUpdatePayload, type TurnNewPayload } from './shared/types';

const API_URL = import.meta.env.VITE_API_URL || '';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

function getStoredSessionId(): string | undefined {
  try {
    const stored = localStorage.getItem('drews-session');
    return stored ? JSON.parse(stored).sessionId : undefined;
  } catch {
    return undefined;
  }
}

export async function initSession(): Promise<{ sessionId: string; role?: string; name?: string }> {
  const headers: Record<string, string> = {};
  const sid = getStoredSessionId();
  if (sid) headers['Authorization'] = `Bearer ${sid}`;

  const res = await fetch(`${API_URL}/api/session`, {
    method: 'POST',
    credentials: 'include',
    headers,
  });
  return res.json();
}

export function connectSocket() {
  if (socket?.connected) return;

  const sid = getStoredSessionId();

  socket = io(API_URL || undefined, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    auth: sid ? { sessionId: sid } : undefined,
  });

  socket.on('connect', () => {
    useStore.setState({ connected: true });
  });

  socket.on('disconnect', () => {
    useStore.setState({ connected: false });
  });

  socket.on(S2C.STATE_UPDATE, (data: StateUpdatePayload) => {
    useStore.getState().applyState(data.state, data.version);
  });

  socket.on(S2C.TURN_NEW, (_data: TurnNewPayload) => {
    // Turn change handled by state diff in applyState
  });

  socket.on(S2C.YOUR_TURN, () => {
    try {
      if ('vibrate' in navigator) navigator.vibrate(200);
    } catch {}
  });

  socket.on(S2C.SELF_UPDATE, (data: { playerId?: number; isDm: boolean }) => {
    const current = useStore.getState().self;
    useStore.getState().setSelf({ ...current, ...data });
  });

  socket.on('error', (data: { code: string; message: string }) => {
    console.error('Server error:', data.code, data.message);
  });
}

export function sendHello(payload: HelloPayload, onAck: (ack: HelloAck) => void) {
  const s = getSocket();
  if (!s) return;

  const fallbackSid = getStoredSessionId();

  s.emit('hello', { ...payload, sessionId: fallbackSid }, (ack: HelloAck) => {
    if (ack.ok) {
      localStorage.setItem('drews-session', JSON.stringify({
        sessionId: ack.sessionId,
        role: payload.role,
        name: payload.name,
      }));

      useStore.getState().setSelf({
        playerId: ack.playerId,
        isDm: ack.isDm,
        sessionId: ack.sessionId,
      });
      useStore.getState().applyState(ack.state, ack.version);
    }
    onAck(ack);
  });
}
