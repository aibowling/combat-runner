import pg from 'pg';
import type { Server } from 'socket.io';
import type { GameState, Chip, Phase, ReactionBox } from './shared/types.js';

export async function loadGameState(client: pg.PoolClient, io?: Server): Promise<GameState> {
  const gsResult = await client.query(
    `SELECT current_turn, phase, entry_wedge, step_index, revealed,
            previous_npc_names, previous_chips
       FROM game_state WHERE id = 1`
  );
  const gs = gsResult.rows[0];

  const boxesResult = await client.query(
    `SELECT id, label, values, previous_values, bonus, armor, is_npc, position
       FROM reaction_boxes ORDER BY position, id`
  );

  const playersResult = await client.query(
    'SELECT id, display_name, session_id, locked FROM players ORDER BY id'
  );

  const npcsResult = await client.query('SELECT id, name FROM npcs ORDER BY position, id');

  const chipsResult = await client.query(`
    SELECT c.id, c.wedge, c.actor_kind, c.player_id, c.npc_id, c.note, c.resolved,
           COALESCE(p.display_name, n.name) AS display_name
      FROM wheel_chips c
      LEFT JOIN players p ON p.id = c.player_id
      LEFT JOIN npcs    n ON n.id = c.npc_id
     ORDER BY c.wedge, c.id
  `);

  const connectedSessionIds = new Set<string>();
  if (io) {
    const sockets = await io.fetchSockets();
    for (const s of sockets) {
      if (s.data.sessionId) connectedSessionIds.add(s.data.sessionId);
    }
  }

  const chips: Chip[] = chipsResult.rows.map((r: any) => ({
    id: r.id,
    wedge: r.wedge,
    actorKind: r.actor_kind,
    playerId: r.player_id,
    npcId: r.npc_id,
    displayName: r.display_name ?? '?',
    note: r.note,
    resolved: r.resolved,
  }));

  const chipCountByPlayer = new Map<number, number>();
  for (const c of chips) {
    if (c.playerId != null) {
      chipCountByPlayer.set(c.playerId, (chipCountByPlayer.get(c.playerId) ?? 0) + 1);
    }
  }

  return {
    round: gs.current_turn,
    phase: gs.phase as Phase,
    entryWedge: gs.entry_wedge,
    stepIndex: gs.step_index,
    revealed: gs.revealed,
    players: playersResult.rows.map((r: any) => ({
      id: r.id,
      displayName: r.display_name,
      chipsPlaced: chipCountByPlayer.get(r.id) ?? 0,
      locked: r.locked,
      connected: connectedSessionIds.has(r.session_id),
    })),
    npcs: npcsResult.rows.map((r: any) => ({ id: r.id, name: r.name })),
    chips,
    hiddenChipCount: 0,
    previousNpcNames: gs.previous_npc_names ?? [],
    reactionBoxes: boxesResult.rows.map(
      (r: any): ReactionBox => ({
        id: r.id,
        label: r.label,
        values: r.values ?? [],
        previousValues: r.previous_values ?? [],
        bonus: r.bonus,
        armor: r.armor,
        isNpc: r.is_npc,
        position: r.position,
      })
    ),
    // Only enemies can be re-placed, so only enemies are worth counting.
    previousChipCount: ((gs.previous_chips ?? []) as Array<{ actor_kind: string }>).filter(
      (c) => c.actor_kind === 'npc'
    ).length,
  };
}

/**
 * Blind placement is enforced here, not in the UI. While chips are hidden, a
 * player is sent only their own chips — everyone else's never leave the server.
 */
export function redactState(
  state: GameState,
  viewer: { playerId?: number; isDm?: boolean }
): GameState {
  if (viewer.isDm || state.revealed) return state;

  const mine = state.chips.filter(
    (c) => c.actorKind === 'player' && c.playerId === viewer.playerId
  );

  return {
    ...state,
    chips: mine,
    hiddenChipCount: state.chips.length - mine.length,
    players: state.players.map((p) =>
      p.id === viewer.playerId ? p : { ...p, chipsPlaced: null }
    ),
  };
}

/* ---------------------------- undo ---------------------------- */

export interface DbSnapshot {
  gameState: {
    current_turn: number;
    phase: string;
    entry_wedge: number | null;
    step_index: number;
    revealed: boolean;
    dm_session_id: string | null;
    previous_npc_names: string[];
    previous_chips: unknown;
  };
  players: Array<{ id: number; locked: boolean }>;
  npcs: Array<{ id: number; name: string; position: number }>;
  chips: Array<{
    id: number;
    wedge: number;
    actor_kind: string;
    player_id: number | null;
    npc_id: number | null;
    note: string | null;
    resolved: boolean;
  }>;
  boxes: Array<{
    id: number;
    label: string;
    values: number[];
    previous_values: number[];
    bonus: number | null;
    armor: number | null;
    is_npc: boolean;
    position: number;
  }>;
}

export async function captureSnapshot(client: pg.PoolClient): Promise<DbSnapshot> {
  const gs = (await client.query('SELECT * FROM game_state WHERE id = 1')).rows[0];
  const players = (await client.query('SELECT id, locked FROM players ORDER BY id')).rows;
  const npcs = (await client.query('SELECT id, name, position FROM npcs ORDER BY id')).rows;
  const chips = (await client.query('SELECT * FROM wheel_chips ORDER BY id')).rows;
  const boxes = (await client.query('SELECT * FROM reaction_boxes ORDER BY id')).rows;
  return { gameState: gs, players, npcs, chips, boxes };
}

export async function restoreSnapshot(client: pg.PoolClient, snap: DbSnapshot): Promise<void> {
  await client.query('DELETE FROM wheel_chips');
  await client.query('DELETE FROM npcs');
  await client.query('DELETE FROM reaction_boxes');

  await client.query(
    `UPDATE game_state
        SET current_turn = $1, phase = $2, entry_wedge = $3, step_index = $4,
            revealed = $5, previous_npc_names = $6, previous_chips = $7,
            version = version + 1
      WHERE id = 1`,
    [
      snap.gameState.current_turn,
      snap.gameState.phase,
      snap.gameState.entry_wedge,
      snap.gameState.step_index,
      snap.gameState.revealed,
      snap.gameState.previous_npc_names ?? [],
      JSON.stringify(snap.gameState.previous_chips ?? []),
    ]
  );

  for (const b of snap.boxes ?? []) {
    await client.query(
      `INSERT INTO reaction_boxes (id, label, values, previous_values, bonus, armor, is_npc, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [b.id, b.label, b.values, b.previous_values, b.bonus, b.armor, b.is_npc, b.position]
    );
  }

  for (const n of snap.npcs) {
    await client.query('INSERT INTO npcs (id, name, position) VALUES ($1, $2, $3)', [
      n.id,
      n.name,
      n.position,
    ]);
  }

  for (const p of snap.players) {
    await client.query('UPDATE players SET locked = $1 WHERE id = $2', [p.locked, p.id]);
  }

  for (const c of snap.chips) {
    await client.query(
      `INSERT INTO wheel_chips (id, wedge, actor_kind, player_id, npc_id, note, resolved)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [c.id, c.wedge, c.actor_kind, c.player_id, c.npc_id, c.note, c.resolved]
    );
  }

  await client.query(
    "SELECT setval('npcs_id_seq', COALESCE((SELECT MAX(id) FROM npcs), 0) + 1, false)"
  );
  await client.query(
    "SELECT setval('wheel_chips_id_seq', COALESCE((SELECT MAX(id) FROM wheel_chips), 0) + 1, false)"
  );
  await client.query(
    "SELECT setval('reaction_boxes_id_seq', COALESCE((SELECT MAX(id) FROM reaction_boxes), 0) + 1, false)"
  );
}
