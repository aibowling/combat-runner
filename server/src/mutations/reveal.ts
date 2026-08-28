import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';

/** DM override for when someone has wandered off mid-placement. */
export async function reveal(client: pg.PoolClient): Promise<MutationResult> {
  await client.query('UPDATE game_state SET revealed = true WHERE id = 1');
  await bumpVersion(client);
  return {};
}
