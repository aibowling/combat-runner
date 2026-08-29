import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';
import { REACTION_DIE, REROLL_AT_OR_BELOW } from '../shared/types.js';

/**
 * Chips come off the clock, everyone unlocks, and the next entry roll is a
 * fresh one. Nothing carries over into placement — that is what stops it being
 * gamed. The layout is kept aside though, so the DM can choose to drop the same
 * spread back on rather than re-place every enemy by hand.
 *
 * Reaction dice roll over at the same moment: a die of 10 or lower was spent
 * and rerolls, anything above is still held and is left untouched.
 */
export async function endRound(client: pg.PoolClient): Promise<MutationResult> {
  const layout = await client.query(
    `SELECT wedge, actor_kind, player_id, npc_id, note
       FROM wheel_chips
      ORDER BY wedge, id`
  );

  await client.query(
    `UPDATE reaction_boxes
        SET previous_values = values,
            values = COALESCE(
              (SELECT array_agg(
                 CASE WHEN v <= $1 THEN (floor(random() * $2) + 1)::int ELSE v END
                 ORDER BY ord
               )
                 FROM unnest(values) WITH ORDINALITY AS t(v, ord)),
              '{}'::int[]
            )`,
    [REROLL_AT_OR_BELOW, REACTION_DIE]
  );

  await client.query('DELETE FROM wheel_chips');
  await client.query('UPDATE players SET locked = false');
  await client.query(
    `UPDATE game_state
        SET current_turn = current_turn + 1,
            phase = 'placing',
            entry_wedge = NULL,
            step_index = 0,
            revealed = false,
            previous_chips = $1
      WHERE id = 1`,
    [JSON.stringify(layout.rows)]
  );
  await bumpVersion(client);

  return { newRound: true };
}
