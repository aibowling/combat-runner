import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';

export async function newSession(client: pg.PoolClient): Promise<MutationResult> {
  await client.query('DELETE FROM wheel_chips');
  await client.query('DELETE FROM npcs');
  await client.query('DELETE FROM reaction_boxes');
  await client.query('DELETE FROM players');
  await client.query(
    `UPDATE game_state
        SET current_turn = 1,
            phase = 'placing',
            entry_wedge = NULL,
            step_index = 0,
            revealed = false,
            previous_chips = '[]'::jsonb,
            previous_npc_names = '{}',
            dm_session_id = NULL
      WHERE id = 1`
  );
  await bumpVersion(client);

  return {};
}
