import pg from 'pg';
import type { MutationResult } from './mutate.js';
import { getUndoSnapshot, clearUndoSnapshot } from './mutate.js';
import { restoreSnapshot } from '../state.js';

export async function undo(client: pg.PoolClient): Promise<MutationResult> {
  const snapshot = getUndoSnapshot();
  if (!snapshot) throw new Error('Nothing to undo');

  await restoreSnapshot(client, snapshot);
  clearUndoSnapshot();

  return { skipUndoSnapshot: true };
}
