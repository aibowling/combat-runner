import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { getTopPlayerId } from './mutate.js';

export async function startRound(client: pg.PoolClient): Promise<MutationResult> {
  const { rows } = await client.query('SELECT count(*)::int AS count FROM initiative_tokens WHERE completed = false');
  if (rows[0].count === 0) {
    throw new Error('No tokens to start round with');
  }

  // Randomize positions of all non-completed tokens
  const tokens = await client.query(
    'SELECT id FROM initiative_tokens WHERE completed = false ORDER BY random()'
  );

  for (let i = 0; i < tokens.rows.length; i++) {
    await client.query(
      'UPDATE initiative_tokens SET position = $1 WHERE id = $2',
      [i + 1, tokens.rows[i].id]
    );
  }

  await client.query('UPDATE game_state SET round_started = true, version = version + 1 WHERE id = 1');

  const newTop = await getTopPlayerId(client);
  return { newTopPlayerId: newTop };
}
