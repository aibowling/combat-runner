import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';
import { WEDGE_COUNT } from '../shared/types.js';

/**
 * One d10 decides where the rotation starts. Rolled fresh every round so
 * nobody can place against a known order.
 */
export async function rollEntry(
  client: pg.PoolClient,
  forced?: number
): Promise<MutationResult> {
  let wedge: number;
  if (forced !== undefined) {
    if (!Number.isInteger(forced) || forced < 1 || forced > WEDGE_COUNT) {
      throw new Error('Entry wedge must be 1 to 10');
    }
    wedge = forced;
  } else {
    wedge = Math.floor(Math.random() * WEDGE_COUNT) + 1;
  }

  await client.query(
    `UPDATE game_state
        SET entry_wedge = $1, step_index = 0, phase = 'resolving', revealed = true
      WHERE id = 1`,
    [wedge]
  );
  await client.query('UPDATE wheel_chips SET resolved = false');
  await bumpVersion(client);

  return { reachedWedge: wedge };
}
