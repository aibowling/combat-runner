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
 * Drop last round's spread back onto the clock. Actors that have since left the
 * fight are skipped rather than resurrected, and a wedge a chip already sits on
 * is left alone — the unique index would reject the duplicate anyway, and this
 * way a partly re-placed board still fills in the gaps.
 *
 * A stored chip is also re-checked against the current layout, since a spread
 * saved before a layout change could otherwise land a player on an enemy wedge.
 */
export async function repeatPreviousChips(client: pg.PoolClient): Promise<MutationResult> {
  const gs = await client.query(
    'SELECT phase, previous_chips FROM game_state WHERE id = 1'
  );
  if (gs.rows[0].phase !== 'placing') {
    throw new Error('Finish the round before re-placing chips');
  }

  const previous: StoredChip[] = gs.rows[0].previous_chips ?? [];
  if (previous.length === 0) throw new Error('No chips from last round to repeat');

  const playerIds = new Set<number>(
    (await client.query('SELECT id FROM players')).rows.map((r: any) => r.id)
  );
  const npcIds = new Set<number>(
    (await client.query('SELECT id FROM npcs')).rows.map((r: any) => r.id)
  );
  const taken = new Set<string>(
    (await client.query('SELECT wedge, player_id, npc_id FROM wheel_chips')).rows.map(
      (r: any) => `${r.wedge}:${r.player_id ?? 'n' + r.npc_id}`
    )
  );

  let placed = 0;
  for (const chip of previous) {
    const actorId = chip.actor_kind === 'player' ? chip.player_id : chip.npc_id;
    if (actorId == null) continue;

    const stillHere =
      chip.actor_kind === 'player' ? playerIds.has(actorId) : npcIds.has(actorId);
    if (!stillHere) continue;

    const needs = chip.actor_kind === 'player' ? 'player' : 'enemy';
    if (wedgeType(chip.wedge) !== needs) continue;

    const key = `${chip.wedge}:${chip.actor_kind === 'player' ? actorId : 'n' + actorId}`;
    if (taken.has(key)) continue;

    await client.query(
      `INSERT INTO wheel_chips (wedge, actor_kind, player_id, npc_id, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [chip.wedge, chip.actor_kind, chip.player_id, chip.npc_id, chip.note]
    );
    taken.add(key);
    placed++;
  }

  if (placed === 0) throw new Error('Every chip from last round is already placed');

  await bumpVersion(client);
  return {};
}
