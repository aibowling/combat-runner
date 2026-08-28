import type { Socket, Server } from 'socket.io';
import pg from 'pg';
import { C2S, S2C } from '../shared/types.js';
import { mutate } from '../mutations/mutate.js';
import { placeChip } from '../mutations/placeChip.js';
import { removeChip } from '../mutations/removeChip.js';
import { setLocked } from '../mutations/lockIn.js';

function wrapPlayer(
  socket: Socket,
  handler: (playerId: number, data: any) => Promise<void>
) {
  return async (data: any, ack?: Function) => {
    try {
      if (!socket.data.playerId) {
        socket.emit(S2C.ERROR, { code: 'NO_PLAYER', message: 'Not registered as a player' });
        ack?.({ ok: false, message: 'Not registered as a player' });
        return;
      }
      await handler(socket.data.playerId, data);
      ack?.({ ok: true });
    } catch (err: any) {
      console.error(`[player] ${err.message}`);
      socket.emit(S2C.ERROR, { code: 'INTERNAL', message: err.message || 'Something went wrong' });
      ack?.({ ok: false, message: err.message || 'Something went wrong' });
    }
  };
}

export function registerPlayerHandlers(socket: Socket, pool: pg.Pool, io: Server) {
  socket.removeAllListeners(C2S.PLAYER_CHIP_PLACE);
  socket.removeAllListeners(C2S.PLAYER_CHIP_REMOVE);
  socket.removeAllListeners(C2S.PLAYER_LOCK_IN);
  socket.removeAllListeners(C2S.PLAYER_UNLOCK);

  socket.on(C2S.PLAYER_CHIP_PLACE, wrapPlayer(socket, async (playerId, data) => {
    await mutate(pool, io, (client) =>
      placeChip(client, { kind: 'player', playerId }, data?.wedge, data?.note)
    );
  }));

  socket.on(C2S.PLAYER_CHIP_REMOVE, wrapPlayer(socket, async (playerId, data) => {
    await mutate(pool, io, (client) => removeChip(client, data?.chipId, playerId));
  }));

  socket.on(C2S.PLAYER_LOCK_IN, wrapPlayer(socket, async (playerId) => {
    await mutate(pool, io, (client) => setLocked(client, playerId, true));
  }));

  socket.on(C2S.PLAYER_UNLOCK, wrapPlayer(socket, async (playerId) => {
    await mutate(pool, io, (client) => setLocked(client, playerId, false));
  }));
}
