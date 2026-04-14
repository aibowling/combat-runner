import pg from 'pg';
import type { MutationResult } from './mutate.js';

export async function endRound(client: pg.PoolClient): Promise<MutationResult> {
  const { rows } = await client.query('SELECT round_ended FROM game_state WHERE id = 1');
  if (!rows[0].round_ended) {
    throw new Error('Round is not ended yet — tokens still remain');
  }

  // Capture NPC token names so DM can copy them into next round
  const npcResult = await client.query(
    "SELECT display_name FROM initiative_tokens WHERE kind = 'npc' ORDER BY position, id"
  );
  const npcNames: string[] = npcResult.rows.map((r: any) => r.display_name);

  await client.query(`
    UPDATE reaction_boxes
    SET previous_values = values,
        values = COALESCE(
          (SELECT array_agg(
            CASE WHEN v < 10 THEN (floor(random() * 20) + 1)::int ELSE v END
          ) FROM unnest(values) v),
          '{}'::int[]
        )
  `);

  await client.query('DELETE FROM initiative_tokens');
  await client.query('UPDATE players SET main_tokens_used = 0, custom_tokens_used = 0');
  await client.query(
    'UPDATE game_state SET current_turn = current_turn + 1, round_ended = false, round_started = false, previous_npc_names = $1, version = version + 1 WHERE id = 1',
    [npcNames]
  );

  return { newTurn: true };
}
