import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';

export async function setLocked(
  client: pg.PoolClient,
  playerId: number,
  locked: boolean
): Promise<MutationResult> {
  const gs = await client.query('SELECT phase, revealed FROM game_state WHERE id = 1');
  if (gs.rows[0].phase !== 'placing') throw new Error('The round is already resolving');
  if (!locked && gs.rows[0].revealed) {
    throw new Error('Chips are already face up for this round');
  }

  const { rowCount } = await client.query(
    'UPDATE players SET locked = $1 WHERE id = $2',
    [locked, playerId]
  );
  if (!rowCount) throw new Error('Player not found');

  await bumpVersion(client);
  return {};
}
