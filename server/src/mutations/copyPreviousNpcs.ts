import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { createBoxForNpc } from './editBox.js';

export async function copyPreviousNpcs(client: pg.PoolClient): Promise<MutationResult> {
  const gsResult = await client.query('SELECT previous_npc_names FROM game_state WHERE id = 1');
  const names: string[] = gsResult.rows[0]?.previous_npc_names ?? [];

  if (names.length === 0) {
    throw new Error('No previous NPCs to copy');
  }

  const maxPos = await client.query('SELECT COALESCE(MAX(position), 0) AS max FROM initiative_tokens');
  let nextPos = maxPos.rows[0].max + 1;

  for (const name of names) {
    await client.query(
      'INSERT INTO initiative_tokens (display_name, player_id, kind, position) VALUES ($1, NULL, $2, $3)',
      [name, 'npc', nextPos++]
    );
    await createBoxForNpc(client, name);
  }

  await client.query('UPDATE game_state SET version = version + 1 WHERE id = 1');

  return {};
}
