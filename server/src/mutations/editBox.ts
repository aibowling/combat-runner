import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';
import {
  MAX_NAME_LENGTH,
  MAX_BOX_VALUES,
  NEW_BOX_VALUES,
  REACTION_DIE,
  rollReaction,
} from '../shared/types.js';

async function insertBox(client: pg.PoolClient, label: string, isNpc: boolean): Promise<void> {
  const posResult = await client.query(
    'SELECT COALESCE(MAX(position), 0) AS max FROM reaction_boxes'
  );
  const values = Array.from({ length: NEW_BOX_VALUES }, rollReaction);
  await client.query(
    `INSERT INTO reaction_boxes (label, values, previous_values, position, is_npc)
     VALUES ($1, $2, '{}', $3, $4)`,
    [label, values, posResult.rows[0].max + 1, isNpc]
  );
}

export async function createBox(client: pg.PoolClient, label?: string): Promise<MutationResult> {
  const clean = (label || '').trim().slice(0, MAX_NAME_LENGTH) || 'New box';
  await insertBox(client, clean, false);
  await bumpVersion(client);
  return {};
}

/** Every enemy gets a box when it joins the fight. Called from addNpcs. */
export async function createBoxForNpc(client: pg.PoolClient, npcName: string): Promise<void> {
  const clean = (npcName || '').trim().slice(0, MAX_NAME_LENGTH) || 'Enemy';
  await insertBox(client, clean, true);
}

/** The enemy's box leaves with it, so the panel does not fill with ghosts. */
export async function deleteBoxForNpc(client: pg.PoolClient, npcName: string): Promise<void> {
  await client.query('DELETE FROM reaction_boxes WHERE is_npc = true AND label = $1', [npcName]);
}

export async function updateBox(
  client: pg.PoolClient,
  boxId: number,
  label?: string,
  values?: number[],
  bonus?: number | null,
  armor?: number | null
): Promise<MutationResult> {
  const { rowCount } = await client.query('SELECT 1 FROM reaction_boxes WHERE id = $1', [boxId]);
  if (!rowCount) throw new Error('Box not found');

  if (label !== undefined) {
    const clean = label.trim().slice(0, MAX_NAME_LENGTH) || 'Box';
    await client.query('UPDATE reaction_boxes SET label = $1 WHERE id = $2', [clean, boxId]);
  }

  if (values !== undefined) {
    const clean = values
      .slice(0, MAX_BOX_VALUES)
      .map((v) => Math.max(1, Math.min(REACTION_DIE, Math.floor(v) || 1)));
    await client.query('UPDATE reaction_boxes SET values = $1 WHERE id = $2', [clean, boxId]);
  }

  if (bonus !== undefined) {
    const clean = bonus === null ? null : Math.max(-99, Math.min(99, Math.floor(bonus) || 0));
    await client.query('UPDATE reaction_boxes SET bonus = $1 WHERE id = $2', [clean, boxId]);
  }

  if (armor !== undefined) {
    const clean = armor === null ? null : Math.max(0, Math.min(99, Math.floor(armor) || 0));
    await client.query('UPDATE reaction_boxes SET armor = $1 WHERE id = $2', [clean, boxId]);
  }

  await bumpVersion(client);
  return {};
}

export async function deleteBox(client: pg.PoolClient, boxId: number): Promise<MutationResult> {
  const { rowCount } = await client.query('DELETE FROM reaction_boxes WHERE id = $1', [boxId]);
  if (!rowCount) throw new Error('Box not found');
  await bumpVersion(client);
  return {};
}
