import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { createBoxForNpc } from './editBox.js';
import { MAX_NPC_BATCH, MAX_NAME_LENGTH } from '../shared/types.js';

export async function addNpcs(
  client: pg.PoolClient,
  name: string,
  count: number
): Promise<MutationResult> {
  const sanitizedName = name.trim().slice(0, MAX_NAME_LENGTH);
  if (!sanitizedName) throw new Error('NPC name cannot be empty');

  const clampedCount = Math.min(Math.max(1, Math.floor(count)), MAX_NPC_BATCH);

  for (let i = 0; i < clampedCount; i++) {
    const displayName = clampedCount > 1 ? `${sanitizedName} ${i + 1}` : sanitizedName;
    await createBoxForNpc(client, displayName);
  }

  await client.query('UPDATE game_state SET version = version + 1 WHERE id = 1');
  return {};
}
