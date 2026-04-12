import pg from 'pg';
import type { Server } from 'socket.io';
import type { GameState } from './shared/types.js';

export async function loadGameState(client: pg.PoolClient, io?: Server): Promise<GameState> {
  const gsResult = await client.query('SELECT current_turn, round_ended FROM game_state WHERE id = 1');
  const gs = gsResult.rows[0];

  const boxesResult = await client.query(
    'SELECT id, label, values, previous_values, position FROM reaction_boxes ORDER BY position'
  );

  const playersResult = await client.query(
    'SELECT id, display_name, session_id, main_tokens_used, custom_tokens_used FROM players ORDER BY id'
  );

  const queueResult = await client.query(
    'SELECT id, display_name, kind, player_id FROM initiative_tokens ORDER BY position, id'
  );

  const connectedSessionIds = new Set<string>();
  if (io) {
    const sockets = await io.fetchSockets();
    for (const s of sockets) {
      if (s.data.sessionId) connectedSessionIds.add(s.data.sessionId);
    }
  }

  return {
    currentTurn: gs.current_turn,
    roundEnded: gs.round_ended,
    reactionBoxes: boxesResult.rows.map(r => ({
      id: r.id,
      label: r.label,
      values: r.values,
      previousValues: r.previous_values,
      position: r.position,
    })),
    players: playersResult.rows.map(r => ({
      id: r.id,
      displayName: r.display_name,
      mainTokensUsed: r.main_tokens_used,
      customTokensUsed: r.custom_tokens_used,
      connected: connectedSessionIds.has(r.session_id),
    })),
    queue: queueResult.rows.map(r => ({
      id: r.id,
      displayName: r.display_name,
      kind: r.kind,
      playerId: r.player_id,
    })),
  };
}

export interface DbSnapshot {
  gameState: { current_turn: number; round_ended: boolean; dm_session_id: string | null; version: number };
  reactionBoxes: Array<{ id: number; label: string; values: number[]; previous_values: number[]; position: number }>;
  players: Array<{ id: number; display_name: string; session_id: string; main_tokens_used: number; custom_tokens_used: number; last_seen_turn: number }>;
  tokens: Array<{ id: number; display_name: string; player_id: number | null; kind: string; position: number }>;
}

export async function captureSnapshot(client: pg.PoolClient): Promise<DbSnapshot> {
  const gs = (await client.query('SELECT * FROM game_state WHERE id = 1')).rows[0];
  const boxes = (await client.query('SELECT * FROM reaction_boxes ORDER BY id')).rows;
  const players = (await client.query('SELECT * FROM players ORDER BY id')).rows;
  const tokens = (await client.query('SELECT * FROM initiative_tokens ORDER BY id')).rows;
  return { gameState: gs, reactionBoxes: boxes, players, tokens };
}

export async function restoreSnapshot(client: pg.PoolClient, snap: DbSnapshot): Promise<void> {
  await client.query('DELETE FROM initiative_tokens');
  await client.query('DELETE FROM reaction_boxes');

  await client.query(
    `UPDATE game_state SET current_turn = $1, round_ended = $2, dm_session_id = $3, version = version + 1 WHERE id = 1`,
    [snap.gameState.current_turn, snap.gameState.round_ended, snap.gameState.dm_session_id]
  );

  for (const b of snap.reactionBoxes) {
    await client.query(
      'INSERT INTO reaction_boxes (id, label, values, previous_values, position) VALUES ($1, $2, $3, $4, $5)',
      [b.id, b.label, b.values, b.previous_values, b.position]
    );
  }

  for (const p of snap.players) {
    await client.query(
      'UPDATE players SET main_tokens_used = $1, custom_tokens_used = $2, last_seen_turn = $3 WHERE id = $4',
      [p.main_tokens_used, p.custom_tokens_used, p.last_seen_turn, p.id]
    );
  }

  for (const t of snap.tokens) {
    await client.query(
      'INSERT INTO initiative_tokens (id, display_name, player_id, kind, position) VALUES ($1, $2, $3, $4, $5)',
      [t.id, t.display_name, t.player_id, t.kind, t.position]
    );
  }

  // Reset sequences
  await client.query("SELECT setval('reaction_boxes_id_seq', COALESCE((SELECT MAX(id) FROM reaction_boxes), 0) + 1, false)");
  await client.query("SELECT setval('initiative_tokens_id_seq', COALESCE((SELECT MAX(id) FROM initiative_tokens), 0) + 1, false)");
}
