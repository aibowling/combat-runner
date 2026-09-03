import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';
import { MAX_NAME_LENGTH } from '../shared/types.js';

/**
 * The DM adds players by name. The row carries no session until somebody joins
 * on a phone under that name, at which point the hello handler claims it.
 */
export async function addPlayer(client: pg.PoolClient, name: string): Promise<MutationResult> {
  const clean = (name || '').trim().slice(0, MAX_NAME_LENGTH);
  if (!clean) throw new Error('Give the player a name');

  const existing = await client.query('SELECT 1 FROM players WHERE display_name = $1', [clean]);
  if (existing.rows.length > 0) throw new Error(`${clean} is already at the table`);

  await client.query('INSERT INTO players (display_name, session_id) VALUES ($1, NULL)', [clean]);

  await bumpVersion(client);
  return {};
}

export async function removePlayer(
  client: pg.PoolClient,
  playerId: number
): Promise<MutationResult> {
  const { rowCount } = await client.query('DELETE FROM players WHERE id = $1', [playerId]);
  if (!rowCount) throw new Error('Player not found');

  await bumpVersion(client);
  return {};
}
