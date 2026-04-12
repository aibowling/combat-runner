import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { getTopPlayerId, checkRoundEnded } from './mutate.js';
import { MAX_MAIN_TOKENS, MAX_CUSTOM_TOKENS, MAX_NAME_LENGTH, type PlayerTokenKind } from '../../../shared/types.js';

export async function addPlayerToken(
  client: pg.PoolClient,
  playerId: number,
  playerName: string,
  kind: PlayerTokenKind,
  customName?: string
): Promise<MutationResult> {
  const player = await client.query(
    'SELECT main_tokens_used, custom_tokens_used FROM players WHERE id = $1',
    [playerId]
  );
  if (player.rows.length === 0) throw new Error('Player not found');

  const p = player.rows[0];

  if (kind === 'custom') {
    if (p.custom_tokens_used >= MAX_CUSTOM_TOKENS) {
      throw new Error(`Custom token limit reached (${MAX_CUSTOM_TOKENS})`);
    }
  } else {
    if (p.main_tokens_used >= MAX_MAIN_TOKENS) {
      throw new Error(`Main token limit reached (${MAX_MAIN_TOKENS})`);
    }
  }

  const displayName = kind === 'custom' && customName
    ? `${playerName} - ${customName.trim().slice(0, MAX_NAME_LENGTH)}`
    : playerName;

  const maxPos = await client.query('SELECT COALESCE(MAX(position), 0) AS max FROM initiative_tokens');
  const nextPos = maxPos.rows[0].max + 1;

  await client.query(
    'INSERT INTO initiative_tokens (display_name, player_id, kind, position) VALUES ($1, $2, $3, $4)',
    [displayName, playerId, kind, nextPos]
  );

  if (kind === 'custom') {
    await client.query(
      'UPDATE players SET custom_tokens_used = custom_tokens_used + 1 WHERE id = $1',
      [playerId]
    );
  } else {
    await client.query(
      'UPDATE players SET main_tokens_used = main_tokens_used + 1 WHERE id = $1',
      [playerId]
    );
  }

  await client.query('UPDATE game_state SET round_ended = false, version = version + 1 WHERE id = 1');

  const newTop = await getTopPlayerId(client);
  return { newTopPlayerId: newTop };
}
