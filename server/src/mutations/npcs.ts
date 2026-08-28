import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';
import { MAX_NAME_LENGTH, MAX_NPC_BATCH } from '../shared/types.js';
import { createBoxForNpc, deleteBoxForNpc } from './editBox.js';

export async function addNpcs(
  client: pg.PoolClient,
  name: string,
  count = 1
): Promise<MutationResult> {
  const clean = (name || '').trim().slice(0, MAX_NAME_LENGTH);
  if (!clean) throw new Error('Give the enemy a name');

  const n = Math.max(1, Math.min(MAX_NPC_BATCH, Math.floor(count) || 1));
  const posResult = await client.query('SELECT COALESCE(MAX(position), 0) AS max FROM npcs');
  let pos = posResult.rows[0].max;

  const existing = await client.query('SELECT count(*)::int AS c FROM npcs WHERE name LIKE $1', [
    `${clean}%`,
  ]);
  const offset = existing.rows[0].c;

  for (let i = 0; i < n; i++) {
    const label = n === 1 && offset === 0 ? clean : `${clean} ${offset + i + 1}`;
    await client.query('INSERT INTO npcs (name, position) VALUES ($1, $2)', [label, ++pos]);
    await createBoxForNpc(client, label);
  }

  await bumpVersion(client);
  return {};
}

export async function removeNpc(client: pg.PoolClient, npcId: number): Promise<MutationResult> {
  const { rows } = await client.query('DELETE FROM npcs WHERE id = $1 RETURNING name', [npcId]);
  if (rows.length === 0) throw new Error('Enemy not found');
  await deleteBoxForNpc(client, rows[0].name);
  await bumpVersion(client);
  return {};
}

export async function copyPreviousNpcs(client: pg.PoolClient): Promise<MutationResult> {
  const { rows } = await client.query('SELECT previous_npc_names FROM game_state WHERE id = 1');
  const names: string[] = rows[0].previous_npc_names ?? [];
  if (names.length === 0) throw new Error('No enemies from the last combat to bring back');

  const posResult = await client.query('SELECT COALESCE(MAX(position), 0) AS max FROM npcs');
  let pos = posResult.rows[0].max;

  for (const name of names) {
    await client.query('INSERT INTO npcs (name, position) VALUES ($1, $2)', [name, ++pos]);
    await createBoxForNpc(client, name);
  }

  await bumpVersion(client);
  return {};
}
