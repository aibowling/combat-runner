import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';

/**
 * Chips come off the wheel, everyone unlocks, and the next entry roll is a
 * fresh one. Nothing carries over — that is what stops placement being gamed.
 */
export async function endRound(client: pg.PoolClient): Promise<MutationResult> {
  await client.query('DELETE FROM wheel_chips');
  await client.query('UPDATE players SET locked = false');
  await client.query(
    `UPDATE game_state
        SET current_turn = current_turn + 1,
            phase = 'placing',
            entry_wedge = NULL,
            step_index = 0,
            revealed = false
      WHERE id = 1`
  );
  await bumpVersion(client);

  return { newRound: true };
}
