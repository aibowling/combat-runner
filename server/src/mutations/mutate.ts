import pg from 'pg';
import type { Server } from 'socket.io';
import { loadGameState, captureSnapshot, type DbSnapshot } from '../state.js';
import { S2C, wedgeAtStep, wedgeType, WEDGE_COUNT } from '../shared/types.js';
import { emitStateObject } from '../sockets/broadcast.js';

export interface MutationResult {
  newRound?: boolean;
  /** wedge the wheel just landed on, if the pointer moved */
  reachedWedge?: number | null;
  skipUndoSnapshot?: boolean;
}

let lastUndoSnapshot: DbSnapshot | null = null;

export function getUndoSnapshot(): DbSnapshot | null {
  return lastUndoSnapshot;
}

export function clearUndoSnapshot(): void {
  lastUndoSnapshot = null;
}

export function bumpVersion(client: pg.PoolClient) {
  return client.query('UPDATE game_state SET version = version + 1 WHERE id = 1');
}

/**
 * Reveal happens on its own once every connected player has locked in. That is
 * the digital equivalent of everyone turning their chips face up at once.
 */
async function maybeAutoReveal(client: pg.PoolClient, io: Server): Promise<void> {
  const gs = await client.query('SELECT phase, revealed FROM game_state WHERE id = 1');
  if (gs.rows[0].revealed || gs.rows[0].phase !== 'placing') return;

  const sockets = await io.fetchSockets();
  const connectedSids = new Set(sockets.map((s) => s.data.sessionId).filter(Boolean));

  const { rows } = await client.query('SELECT session_id, locked FROM players');
  const present = rows.filter((r: any) => connectedSids.has(r.session_id));
  if (present.length === 0) return;
  if (present.every((r: any) => r.locked)) {
    await client.query('UPDATE game_state SET revealed = true WHERE id = 1');
  }
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
    await maybeAutoReveal(client, io);

    const meta = await client.query(
      'SELECT version, dm_session_id FROM game_state WHERE id = 1'
    );
    const version = meta.rows[0].version;
    const dmSessionId = meta.rows[0].dm_session_id;
    const postState = await loadGameState(client, io);

    await client.query('COMMIT');

    if (!result.skipUndoSnapshot) lastUndoSnapshot = undoSnapshot;

    await emitStateObject(io, postState, version, dmSessionId);

    if (result.newRound) {
      io.emit(S2C.ROUND_NEW, { round: postState.round });
    }

    if (result.reachedWedge) {
      const wedge = result.reachedWedge;
      io.emit(S2C.WEDGE_REACHED, { wedge, type: wedgeType(wedge) });

      const owners = new Set(
        postState.chips
          .filter((c) => c.wedge === wedge && c.playerId != null)
          .map((c) => c.playerId as number)
      );
      if (owners.size) {
        const sockets = await io.fetchSockets();
        for (const s of sockets) {
          if (s.data.playerId && owners.has(s.data.playerId)) {
            s.emit(S2C.YOUR_WEDGE, { wedge, type: wedgeType(wedge) });
          }
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

/** Wedge the pointer currently sits on, or null if the entry hasn't been rolled. */
export async function currentWedge(client: pg.PoolClient): Promise<number | null> {
  const { rows } = await client.query(
    'SELECT phase, entry_wedge, step_index FROM game_state WHERE id = 1'
  );
  const gs = rows[0];
  if (gs.phase !== 'resolving' || gs.entry_wedge == null) return null;
  if (gs.step_index >= WEDGE_COUNT) return null;
  return wedgeAtStep(gs.entry_wedge, gs.step_index);
}
