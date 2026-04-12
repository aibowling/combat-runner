import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { MAX_NAME_LENGTH } from '../shared/types.js';

export async function createBox(client: pg.PoolClient, label: string): Promise<MutationResult> {
  const sanitized = label.trim().slice(0, MAX_NAME_LENGTH) || 'New Box';
  const maxPos = await client.query('SELECT COALESCE(MAX(position), 0) AS max FROM reaction_boxes');
  await client.query(
    'INSERT INTO reaction_boxes (label, values, previous_values, position) VALUES ($1, $2, $3, $4)',
    [sanitized, '{}', '{}', maxPos.rows[0].max + 1]
  );
  await client.query('UPDATE game_state SET version = version + 1 WHERE id = 1');
  return {};
}

export async function updateBox(
  client: pg.PoolClient,
  boxId: number,
  label?: string,
  values?: number[]
): Promise<MutationResult> {
  const existing = await client.query('SELECT id FROM reaction_boxes WHERE id = $1', [boxId]);
  if (existing.rows.length === 0) throw new Error('Box not found');

  if (label !== undefined) {
    const sanitized = label.trim().slice(0, MAX_NAME_LENGTH) || 'Box';
    await client.query('UPDATE reaction_boxes SET label = $1 WHERE id = $2', [sanitized, boxId]);
  }
  if (values !== undefined) {
    const clamped = values.slice(0, 100).map(v => Math.max(1, Math.min(99, Math.floor(v))));
    await client.query('UPDATE reaction_boxes SET values = $1 WHERE id = $2', [clamped, boxId]);
  }

  await client.query('UPDATE game_state SET version = version + 1 WHERE id = 1');
  return {};
}

export async function deleteBox(client: pg.PoolClient, boxId: number): Promise<MutationResult> {
  const { rowCount } = await client.query('DELETE FROM reaction_boxes WHERE id = $1', [boxId]);
  if (!rowCount) throw new Error('Box not found');
  await client.query('UPDATE game_state SET version = version + 1 WHERE id = 1');
  return {};
}
