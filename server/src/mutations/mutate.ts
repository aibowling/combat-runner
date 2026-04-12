import pg from 'pg';
import type { Server } from 'socket.io';
import { loadGameState, captureSnapshot, type DbSnapshot } from '../state.js';
import { S2C } from '../shared/types.js';

export interface MutationResult {
  newTurn?: boolean;
  newTopPlayerId?: number | null;
}

let lastUndoSnapshot: DbSnapshot | null = null;

export function getUndoSnapshot(): DbSnapshot | null {
  return lastUndoSnapshot;
}

export function clearUndoSnapshot(): void {
  lastUndoSnapshot = null;
}

export async function mutate(
  pool: pg.Pool,
  io: Server,
  fn: (client: pg.PoolClient) => Promise<MutationResult>
): Promise<MutationResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await client.query('SELECT * FROM game_state WHERE id = 1 FOR UPDATE');

    const undoSnapshot = await captureSnapshot(client);
    const result = await fn(client);

    const versionResult = await client.query('SELECT version FROM game_state WHERE id = 1');
    const version = versionResult.rows[0].version;
    const postState = await loadGameState(client, io);

    await client.query('COMMIT');

    lastUndoSnapshot = undoSnapshot;

    io.emit(S2C.STATE_UPDATE, { state: postState, version });

    if (result.newTurn) {
      io.emit(S2C.TURN_NEW, { turn: postState.currentTurn });
    }

    if (result.newTopPlayerId) {
      const sockets = await io.fetchSockets();
      for (const s of sockets) {
        if (s.data.playerId === result.newTopPlayerId) {
          s.emit(S2C.YOUR_TURN, {});
        }
      }
    }

    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function getTopPlayerId(client: pg.PoolClient): Promise<number | null> {
  const result = await client.query(
    'SELECT player_id FROM initiative_tokens ORDER BY position, id LIMIT 1'
  );
  return result.rows[0]?.player_id ?? null;
}

export async function checkRoundEnded(client: pg.PoolClient): Promise<void> {
  const { rows } = await client.query('SELECT count(*)::int AS count FROM initiative_tokens');
  if (rows[0].count === 0) {
    await client.query('UPDATE game_state SET round_ended = true, version = version + 1 WHERE id = 1');
  } else {
    await client.query('UPDATE game_state SET round_ended = false, version = version + 1 WHERE id = 1');
  }
}
