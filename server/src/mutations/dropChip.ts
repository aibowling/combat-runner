import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';
import {
  ENEMY_WEDGES,
  PLAYER_WEDGES,
  MAX_CHIPS_PER_PLAYER,
  spreadPick,
} from '../shared/types.js';

export type Actor = { kind: 'player'; playerId: number } | { kind: 'npc'; npcId: number };

function actorId(actor: Actor): number {
  return actor.kind === 'player' ? actor.playerId : actor.npcId;
}

/**
 * Drop one chip for an actor on a wedge the server chooses. The DM taps a name
 * and a chip appears — where it lands does not matter to the rules, only that
 * an actor's chips end up spread around the dial rather than bunched.
 */
export async function dropChip(client: pg.PoolClient, actor: Actor): Promise<MutationResult> {
  const gs = await client.query('SELECT phase FROM game_state WHERE id = 1');
  if (gs.rows[0].phase !== 'placing') {
    throw new Error('The clock is already turning — chips are locked for this round');
  }

  const column = actor.kind === 'player' ? 'player_id' : 'npc_id';
  const table = actor.kind === 'player' ? 'players' : 'npcs';

  const exists = await client.query(`SELECT 1 FROM ${table} WHERE id = $1`, [actorId(actor)]);
  if (exists.rows.length === 0) {
    throw new Error(actor.kind === 'player' ? 'Player not found' : 'Enemy not found');
  }

  const mine = await client.query(
    `SELECT wedge FROM wheel_chips WHERE ${column} = $1`,
    [actorId(actor)]
  );
  const taken: number[] = mine.rows.map((r: any) => r.wedge);

  if (actor.kind === 'player' && taken.length >= MAX_CHIPS_PER_PLAYER) {
    throw new Error(`That is already ${MAX_CHIPS_PER_PLAYER} chips`);
  }

  const wedges = actor.kind === 'player' ? PLAYER_WEDGES : ENEMY_WEDGES;
  const candidates = wedges.filter((w) => !taken.includes(w));
  if (candidates.length === 0) throw new Error('Every wedge already has one of those');

  // Used only to break ties between equally spread-out wedges, so a busy wedge
  // is passed over when an equally good empty one exists.
  const counts = await client.query(
    'SELECT wedge, count(*)::int AS n FROM wheel_chips GROUP BY wedge'
  );
  const crowding = new Map<number, number>(counts.rows.map((r: any) => [r.wedge, r.n]));

  const wedge = spreadPick(candidates, taken, (w) => crowding.get(w) ?? 0);
  if (wedge == null) throw new Error('Nowhere left to put that');

  await client.query(
    `INSERT INTO wheel_chips (wedge, actor_kind, ${column}) VALUES ($1, $2, $3)`,
    [wedge, actor.kind, actorId(actor)]
  );

  await bumpVersion(client);
  return {};
}

/** Take back the last chip dropped for this actor — the undo for a mis-tap. */
export async function undropChip(client: pg.PoolClient, actor: Actor): Promise<MutationResult> {
  const column = actor.kind === 'player' ? 'player_id' : 'npc_id';

  const { rowCount } = await client.query(
    `DELETE FROM wheel_chips
      WHERE id = (SELECT id FROM wheel_chips WHERE ${column} = $1 ORDER BY id DESC LIMIT 1)`,
    [actorId(actor)]
  );
  if (!rowCount) throw new Error('No chips to take back');

  await bumpVersion(client);
  return {};
}
