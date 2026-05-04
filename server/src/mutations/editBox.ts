import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { MAX_NAME_LENGTH } from '../shared/types.js';

export async function createBox(client: pg.PoolClient, label: string): Promise<MutationResult> {
  const sanitized = label.trim().slice(0, MAX_NAME_LENGTH) || 'New Box';
  await insertBox(client, sanitized, false);
  await client.query('UPDATE game_state SET version = version + 1 WHERE id = 1');
  return {};
}

export async function createBoxForNpc(client: pg.PoolClient, npcName: string): Promise<void> {
  const sanitized = npcName.trim().slice(0, MAX_NAME_LENGTH) || 'NPC';
  await insertBox(client, sanitized, true);
}

async function insertBox(client: pg.PoolClient, label: string, isNpc: boolean): Promise<void> {
  const maxPos = await client.query('SELECT COALESCE(MAX(position), 0) AS max FROM reaction_boxes');
  const val1 = Math.floor(Math.random() * 20) + 1;
  const val2 = Math.floor(Math.random() * 20) + 1;
  await client.query(
    'INSERT INTO reaction_boxes (label, values, previous_values, position, is_npc) VALUES ($1, $2, $3, $4, $5)',
    [label, `{${val1},${val2}}`, '{}', maxPos.rows[0].max + 1, isNpc]
  );
}

export async function updateBox(
  client: pg.PoolClient,
  boxId: number,
  label?: string,
  values?: number[],
  bonus?: number | null,
  armor?: number | null
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
  if (bonus !== undefined) {
    const clampedBonus = bonus === null ? null : Math.max(-99, Math.min(99, Math.floor(bonus)));
    await client.query('UPDATE reaction_boxes SET bonus = $1 WHERE id = $2', [clampedBonus, boxId]);
  }
  if (armor !== undefined) {
    const clampedArmor = armor === null ? null : Math.max(0, Math.min(99, Math.floor(armor)));
    await client.query('UPDATE reaction_boxes SET armor = $1 WHERE id = $2', [clampedArmor, boxId]);
  }

  await client.query('UPDATE game_state SET version = version + 1 WHERE id = 1');
  return {};
}

export async function deleteBox(client: pg.PoolClient, boxId: number): Promise<MutationResult> {
  const box = await client.query('SELECT label, is_npc FROM reaction_boxes WHERE id = $1', [boxId]);
  if (box.rows.length === 0) throw new Error('Box not found');

  if (box.rows[0].is_npc) {
    await client.query(
      `DELETE FROM initiative_tokens WHERE kind = 'npc' AND display_name = $1`,
      [box.rows[0].label]
    );
  }
  await client.query('DELETE FROM reaction_boxes WHERE id = $1', [boxId]);
  await client.query('UPDATE game_state SET version = version + 1 WHERE id = 1');
  return {};
}
