import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { createBoxForNpc } from './editBox.js';

export async function copyPreviousNpcs(client: pg.PoolClient): Promise<MutationResult> {
  const gsResult = await client.query('SELECT previous_npc_names FROM game_state WHERE id = 1');
  const names: string[] = gsResult.rows[0]?.previous_npc_names ?? [];

  if (names.length === 0) {
    throw new Error('No previous NPCs to copy');
  }

  for (const name of names) {
    await createBoxForNpc(client, name);
  }

  await client.query('UPDATE game_state SET version = version + 1 WHERE id = 1');
  return {};
}
