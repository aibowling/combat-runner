import pg from 'pg';
import type { MutationResult } from './mutate.js';

export async function newCombat(client: pg.PoolClient): Promise<MutationResult> {
  await client.query('DELETE FROM initiative_tokens');
  await client.query('DELETE FROM reaction_boxes');
  await client.query('UPDATE players SET main_tokens_used = 0, custom_tokens_used = 0');
  await client.query(
    'UPDATE game_state SET current_turn = 1, round_ended = false, round_started = false, version = version + 1 WHERE id = 1'
  );

  return {};
}
