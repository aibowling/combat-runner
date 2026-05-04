import pg from 'pg';
import type { MutationResult } from './mutate.js';

export async function newCombat(client: pg.PoolClient): Promise<MutationResult> {
  // Capture NPC labels before wiping so the DM can re-summon them.
  const npcResult = await client.query(
    'SELECT label FROM reaction_boxes WHERE is_npc = true ORDER BY position, id'
  );
  const npcNames: string[] = npcResult.rows.map((r: any) => r.label);

  await client.query('DELETE FROM initiative_tokens');
  await client.query('DELETE FROM reaction_boxes');
  await client.query('UPDATE players SET main_tokens_used = 0, custom_tokens_used = 0');
  await client.query(
    'UPDATE game_state SET current_turn = 1, round_ended = false, round_started = false, previous_npc_names = $1, version = version + 1 WHERE id = 1',
    [npcNames]
  );

  return {};
}
