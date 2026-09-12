import type { Socket, Server } from 'socket.io';
import pg from 'pg';
import { C2S, S2C } from '../shared/types.js';
import { mutate } from '../mutations/mutate.js';
import { setBeat, clearBeat } from '../mutations/beat.js';

/**
 * The Beat is rolled from the Bard's class hub, which is reached from the front
 * page and never joins as DM, party or player. So unlike every other mutation
 * these are open to any connected socket — the same trusted-table assumption
 * the DM seat already runs on. The payload is still validated server-side.
 *
 * Nudging a die is not what Undo is for, so these skip the snapshot too.
 */
export function registerBeatHandlers(socket: Socket, pool: pg.Pool, io: Server) {
  socket.removeAllListeners(C2S.BEAT_SET);
  socket.removeAllListeners(C2S.BEAT_CLEAR);

  const guard = (handler: () => Promise<void>) => async () => {
    try {
      await handler();
    } catch (err: any) {
      console.error(`[beat] ${err.message}`);
      socket.emit(S2C.ERROR, { code: 'INTERNAL', message: err.message || 'Something went wrong' });
    }
  };

  socket.on(C2S.BEAT_SET, (data: any) =>
    guard(async () => {
      await mutate(pool, io, (client) => setBeat(client, data?.wedges), { snapshot: false });
    })()
  );

  socket.on(C2S.BEAT_CLEAR, () =>
    guard(async () => {
      await mutate(pool, io, (client) => clearBeat(client), { snapshot: false });
    })()
  );
}
