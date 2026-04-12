import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { getTopPlayerId } from './mutate.js';
import { MAX_NPC_BATCH, MAX_NAME_LENGTH } from '../shared/types.js';

export async function addNpcTokens(
  client: pg.PoolClient,
  name: string,
  count: number
): Promise<MutationResult> {
  const sanitizedName = name.trim().slice(0, MAX_NAME_LENGTH);
  if (!sanitizedName) throw new Error('NPC name cannot be empty');

  const clampedCount = Math.min(Math.max(1, Math.floor(count)), MAX_NPC_BATCH);

  const maxPos = await client.query('SELECT COALESCE(MAX(position), 0) AS max FROM initiative_tokens');
  let nextPos = maxPos.rows[0].max + 1;

  for (let i = 0; i < clampedCount; i++) {
    const displayName = clampedCount > 1 ? `${sanitizedName} ${i + 1}` : sanitizedName;
    await client.query(
      'INSERT INTO initiative_tokens (display_name, player_id, kind, position) VALUES ($1, NULL, $2, $3)',
      [displayName, 'npc', nextPos++]
    );
  }

  await client.query('UPDATE game_state SET round_ended = false, version = version + 1 WHERE id = 1');

  const newTop = await getTopPlayerId(client);
  return { newTopPlayerId: newTop };
}
