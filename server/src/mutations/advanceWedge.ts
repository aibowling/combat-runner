import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { bumpVersion } from './mutate.js';
import { wedgeAtStep, WEDGE_COUNT } from '../shared/types.js';

/** Step the pointer one wedge clockwise, marking the wedge behind it resolved. */
export async function advanceWedge(client: pg.PoolClient): Promise<MutationResult> {
  const { rows } = await client.query(
    'SELECT phase, entry_wedge, step_index FROM game_state WHERE id = 1'
  );
  const gs = rows[0];
  if (gs.phase !== 'resolving' || gs.entry_wedge == null) {
    throw new Error('Roll the entry wedge first');
  }
  if (gs.step_index >= WEDGE_COUNT) {
    throw new Error('The rotation is finished — end the round');
  }

  const leaving = wedgeAtStep(gs.entry_wedge, gs.step_index);
  await client.query('UPDATE wheel_chips SET resolved = true WHERE wedge = $1', [leaving]);

  const nextStep = gs.step_index + 1;
  await client.query('UPDATE game_state SET step_index = $1 WHERE id = 1', [nextStep]);
  await bumpVersion(client);

  const reached =
    nextStep >= WEDGE_COUNT ? null : wedgeAtStep(gs.entry_wedge, nextStep);
  return { reachedWedge: reached };
}

export async function stepBack(client: pg.PoolClient): Promise<MutationResult> {
  const { rows } = await client.query(
    'SELECT phase, entry_wedge, step_index FROM game_state WHERE id = 1'
  );
  const gs = rows[0];
  if (gs.phase !== 'resolving' || gs.entry_wedge == null) {
    throw new Error('Nothing to step back through');
  }
  if (gs.step_index <= 0) throw new Error('Already at the entry wedge');

  const prevStep = gs.step_index - 1;
  const returning = wedgeAtStep(gs.entry_wedge, prevStep);

  await client.query('UPDATE wheel_chips SET resolved = false WHERE wedge = $1', [returning]);
  await client.query('UPDATE game_state SET step_index = $1 WHERE id = 1', [prevStep]);
  await bumpVersion(client);

  return { reachedWedge: returning };
}
