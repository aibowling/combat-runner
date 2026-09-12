import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';
import { BEAT_WEDGES, MAX_BEAT_DICE } from '../shared/types.js';

/**
 * Record where the Beat falls. The Bard rolls it on their own phone, but the
 * result belongs on the clock the whole table is looking at, so it is validated
 * here rather than trusted: only legal wedges, no repeats, and no more dice
 * than the fastest Tempo could ever call for.
 */
export async function setBeat(
  client: pg.PoolClient,
  wedges: unknown
): Promise<MutationResult> {
  if (!Array.isArray(wedges)) throw new Error('The Beat needs a list of wedges');

  const clean: number[] = [];
  for (const raw of wedges) {
    const w = Math.floor(Number(raw));
    if (!BEAT_WEDGES.includes(w)) continue;
    if (clean.includes(w)) continue;
    clean.push(w);
  }

  if (clean.length > MAX_BEAT_DICE) clean.length = MAX_BEAT_DICE;
  clean.sort((a, b) => a - b);

  await client.query('UPDATE game_state SET beat = $1 WHERE id = 1', [clean]);
  await bumpVersion(client);
  return {};
}

export async function clearBeat(client: pg.PoolClient): Promise<MutationResult> {
  await client.query("UPDATE game_state SET beat = '{}' WHERE id = 1");
  await bumpVersion(client);
  return {};
}
