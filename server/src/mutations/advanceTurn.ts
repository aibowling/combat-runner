import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { checkRoundEnded, getTopPlayerId } from './mutate.js';

export async function advanceTurn(client: pg.PoolClient): Promise<MutationResult> {
  const top = await client.query(
    'SELECT id FROM initiative_tokens ORDER BY position, id LIMIT 1'
  );
  if (top.rows.length === 0) {
    throw new Error('Queue is empty — nothing to advance');
  }

  await client.query('DELETE FROM initiative_tokens WHERE id = $1', [top.rows[0].id]);
  await checkRoundEnded(client);

  const newTop = await getTopPlayerId(client);
  return { newTopPlayerId: newTop };
}
