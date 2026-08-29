import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';
import { wedgeType } from '../shared/types.js';

interface StoredChip {
  wedge: number;
  actor_kind: 'player' | 'npc';
  player_id: number | null;
  npc_id: number | null;
  note: string | null;
}

/**
 * Drop last round's enemies back onto the clock. Only enemies — players place
 * their own chips, blind, and having them appear pre-placed would take that
 * decision away from them.
 *
 * Enemies that have since left the fight are skipped rather than resurrected,
 * and a wedge a chip already sits on is left alone — the unique index would
 * reject the duplicate anyway, and this way a partly re-placed board still
 * fills in the gaps. Each chip is re-checked against the current layout too,
 * since a spread saved before a layout change could land on the wrong wedge.
 */
export async function repeatPreviousChips(client: pg.PoolClient): Promise<MutationResult> {
  const gs = await client.query(
    'SELECT phase, previous_chips FROM game_state WHERE id = 1'
  );
  if (gs.rows[0].phase !== 'placing') {
    throw new Error('Finish the round before re-placing chips');
  }

  const stored: StoredChip[] = gs.rows[0].previous_chips ?? [];
  const previous = stored.filter((c) => c.actor_kind === 'npc');
  if (previous.length === 0) throw new Error('No enemy chips from last round to repeat');

  const npcIds = new Set<number>(
    (await client.query('SELECT id FROM npcs')).rows.map((r: any) => r.id)
  );
  const taken = new Set<string>(
    (await client.query('SELECT wedge, npc_id FROM wheel_chips WHERE npc_id IS NOT NULL')).rows.map(
      (r: any) => `${r.wedge}:${r.npc_id}`
    )
  );

  let placed = 0;
  for (const chip of previous) {
    if (chip.npc_id == null || !npcIds.has(chip.npc_id)) continue;
    if (wedgeType(chip.wedge) !== 'enemy') continue;

    const key = `${chip.wedge}:${chip.npc_id}`;
    if (taken.has(key)) continue;

    await client.query(
      `INSERT INTO wheel_chips (wedge, actor_kind, npc_id, note)
       VALUES ($1, 'npc', $2, $3)`,
      [chip.wedge, chip.npc_id, chip.note]
    );
    taken.add(key);
    placed++;
  }

  if (placed === 0) throw new Error('Every enemy from last round is already placed');

  await bumpVersion(client);
  return {};
}
