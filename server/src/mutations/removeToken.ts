import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { checkRoundEnded, getTopPlayerId } from './mutate.js';

export async function removeToken(
  client: pg.PoolClient,
  tokenId: number,
  callerPlayerId?: number
): Promise<MutationResult> {
  if (callerPlayerId !== undefined) {
    const { rows } = await client.query(
      'SELECT player_id FROM initiative_tokens WHERE id = $1',
      [tokenId]
    );
    if (rows.length === 0) throw new Error('Token not found');
    if (rows[0].player_id !== callerPlayerId) throw new Error('Not your token');
  }

  const { rowCount } = await client.query(
    'DELETE FROM initiative_tokens WHERE id = $1',
    [tokenId]
  );
  if (!rowCount) throw new Error('Token not found');

  await checkRoundEnded(client);
  const newTop = await getTopPlayerId(client);
  return { newTopPlayerId: newTop };
}
