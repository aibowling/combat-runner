import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';

export async function newCombat(client: pg.PoolClient): Promise<MutationResult> {
  const npcResult = await client.query('SELECT name FROM npcs ORDER BY position, id');
  const npcNames: string[] = npcResult.rows.map((r: any) => r.name);

  await client.query('DELETE FROM wheel_chips');
  await client.query('DELETE FROM npcs');
  await client.query('DELETE FROM reaction_boxes');
  await client.query('UPDATE players SET locked = false');
  await client.query(
    `UPDATE game_state
        SET current_turn = 1,
            phase = 'placing',
            entry_wedge = NULL,
            step_index = 0,
            revealed = false,
            previous_chips = '[]'::jsonb,
            previous_npc_names = $1
      WHERE id = 1`,
    [npcNames]
  );
  await bumpVersion(client);

  return {};
}
