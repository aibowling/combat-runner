import pg from 'pg';
import type { MutationResult } from './mutate.js';

export async function newSession(client: pg.PoolClient): Promise<MutationResult> {
  await client.query('DELETE FROM initiative_tokens');
  await client.query('DELETE FROM reaction_boxes');
  await client.query('DELETE FROM players');
  await client.query(
    `UPDATE game_state
       SET current_turn = 1,
           round_ended = false,
           round_started = false,
           previous_npc_names = '{}',
           dm_session_id = NULL,
           version = version + 1
     WHERE id = 1`
  );

  return {};
}
