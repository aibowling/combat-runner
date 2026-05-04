import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { getTopPlayerId } from './mutate.js';

export async function addNpcToken(
  client: pg.PoolClient,
  boxId: number
): Promise<MutationResult> {
  const box = await client.query(
    'SELECT label, is_npc FROM reaction_boxes WHERE id = $1',
    [boxId]
  );
  if (box.rows.length === 0) throw new Error('NPC not found');
  if (!box.rows[0].is_npc) throw new Error('Not an NPC');

  const label: string = box.rows[0].label;

  const maxPos = await client.query(
    'SELECT COALESCE(MAX(position), 0) AS max FROM initiative_tokens'
  );
  await client.query(
    'INSERT INTO initiative_tokens (display_name, player_id, kind, position) VALUES ($1, NULL, $2, $3)',
    [label, 'npc', maxPos.rows[0].max + 1]
  );

  await client.query(
    'UPDATE game_state SET round_ended = false, version = version + 1 WHERE id = 1'
  );

  const newTop = await getTopPlayerId(client);
  return { newTopPlayerId: newTop };
}
