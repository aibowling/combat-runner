import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';
import {
  wedgeType,
  MAX_NOTE_LENGTH,
  MAX_CHIPS_PER_PLAYER,
} from '../shared/types.js';

/**
 * Place one chip. The two hard rules live here and in the unique indexes:
 * an actor may hold at most one chip on any given wedge, and players may
 * only use player wedges (NPCs, enemy wedges).
 */
export async function placeChip(
  client: pg.PoolClient,
  actor: { kind: 'player'; playerId: number } | { kind: 'npc'; npcId: number },
  wedge: number,
  note?: string
): Promise<MutationResult> {
  if (!Number.isInteger(wedge) || wedge < 1 || wedge > 10) {
    throw new Error('That wedge does not exist');
  }

  const gs = await client.query('SELECT phase FROM game_state WHERE id = 1');
  if (gs.rows[0].phase !== 'placing') {
    throw new Error('The wheel is already turning — chips are locked for this round');
  }

  const type = wedgeType(wedge);
  const trimmedNote = note?.trim().slice(0, MAX_NOTE_LENGTH) || null;

  if (actor.kind === 'player') {
    if (type !== 'player') throw new Error('That wedge is not a player wedge');

    const locked = await client.query('SELECT locked FROM players WHERE id = $1', [
      actor.playerId,
    ]);
    if (locked.rows.length === 0) throw new Error('Player not found');
    if (locked.rows[0].locked) throw new Error('You have locked in — unlock to change chips');

    const count = await client.query(
      'SELECT count(*)::int AS n FROM wheel_chips WHERE player_id = $1',
      [actor.playerId]
    );
    if (count.rows[0].n >= MAX_CHIPS_PER_PLAYER) {
      throw new Error(`You have already placed ${MAX_CHIPS_PER_PLAYER} chips`);
    }

    const existing = await client.query(
      'SELECT 1 FROM wheel_chips WHERE wedge = $1 AND player_id = $2',
      [wedge, actor.playerId]
    );
    if (existing.rows.length > 0) {
      throw new Error('You already have a chip on that wedge');
    }

    await client.query(
      `INSERT INTO wheel_chips (wedge, actor_kind, player_id, note)
       VALUES ($1, 'player', $2, $3)`,
      [wedge, actor.playerId, trimmedNote]
    );
  } else {
    if (type !== 'enemy') throw new Error('That wedge is not an enemy wedge');

    const npc = await client.query('SELECT 1 FROM npcs WHERE id = $1', [actor.npcId]);
    if (npc.rows.length === 0) throw new Error('Enemy not found');

    const existing = await client.query(
      'SELECT 1 FROM wheel_chips WHERE wedge = $1 AND npc_id = $2',
      [wedge, actor.npcId]
    );
    if (existing.rows.length > 0) {
      throw new Error('That enemy already has a chip on that wedge');
    }

    await client.query(
      `INSERT INTO wheel_chips (wedge, actor_kind, npc_id, note)
       VALUES ($1, 'npc', $2, $3)`,
      [wedge, actor.npcId, trimmedNote]
    );
  }

  await bumpVersion(client);
  return {};
}
