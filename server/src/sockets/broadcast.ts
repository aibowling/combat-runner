import type { Server } from 'socket.io';
import pg from 'pg';
import { loadGameState } from '../state.js';
import { S2C, type GameState } from '../../../shared/types.js';

export async function emitFullState(io: Server, pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    const state = await loadGameState(client, io);
    const vResult = await client.query('SELECT version FROM game_state WHERE id = 1');
    io.emit(S2C.STATE_UPDATE, { state, version: vResult.rows[0].version });
  } finally {
    client.release();
  }
}
