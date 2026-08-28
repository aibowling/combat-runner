import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';

export async function removeChip(
  client: pg.PoolClient,
  chipId: number,
  callerPlayerId?: number
): Promise<MutationResult> {
  const { rows } = await client.query(
    'SELECT player_id FROM wheel_chips WHERE id = $1',
    [chipId]
  );
  if (rows.length === 0) throw new Error('Chip not found');

  if (callerPlayerId !== undefined) {
    if (rows[0].player_id !== callerPlayerId) throw new Error('That is not your chip');

    const locked = await client.query('SELECT locked FROM players WHERE id = $1', [
      callerPlayerId,
    ]);
    if (locked.rows[0]?.locked) throw new Error('You have locked in — unlock to change chips');
  }

  await client.query('DELETE FROM wheel_chips WHERE id = $1', [chipId]);
  await bumpVersion(client);
  return {};
}
