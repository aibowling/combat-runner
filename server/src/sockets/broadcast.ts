import type { Server } from 'socket.io';
import pg from 'pg';
import { loadGameState, redactState } from '../state.js';
import { S2C, type GameState } from '../shared/types.js';

/**
 * Every client gets its own view of the same state. During blind placement
 * that means each player's socket receives only their own chips.
 */
export async function emitStateObject(
  io: Server,
  state: GameState,
  version: number,
  dmSessionId: string | null
): Promise<void> {
  const sockets = await io.fetchSockets();
  for (const s of sockets) {
    const isDm = !!dmSessionId && s.data.sessionId === dmSessionId;
    s.emit(S2C.STATE_UPDATE, {
      state: redactState(state, { playerId: s.data.playerId, isDm }),
      version,
    });
  }
}

export async function emitFullState(io: Server, pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    const state = await loadGameState(client, io);
    const { rows } = await client.query(
      'SELECT version, dm_session_id FROM game_state WHERE id = 1'
    );
    await emitStateObject(io, state, rows[0].version, rows[0].dm_session_id);
  } finally {
    client.release();
  }
}
