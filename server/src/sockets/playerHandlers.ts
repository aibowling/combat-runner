import type { Socket, Server } from 'socket.io';
import pg from 'pg';
import { C2S } from '../../../shared/types.js';
import { mutate } from '../mutations/mutate.js';
import { addPlayerToken } from '../mutations/addPlayerToken.js';
import { removeToken } from '../mutations/removeToken.js';

export function registerPlayerHandlers(socket: Socket, pool: pg.Pool, io: Server) {
  socket.on(C2S.PLAYER_TOKEN_ADD, async (data: any, ack?: Function) => {
    try {
      if (!socket.data.playerId) {
        socket.emit('error', { code: 'NO_PLAYER', message: 'Not registered as a player' });
        ack?.({ ok: false, message: 'Not registered as a player' });
        return;
      }

      await mutate(pool, io, (client) =>
        addPlayerToken(client, socket.data.playerId, socket.data.playerName, data.kind, data.name)
      );
      ack?.({ ok: true });
    } catch (err: any) {
      console.error(`[player] ${err.message}`);
      socket.emit('error', { code: 'INTERNAL', message: err.message || 'Something went wrong' });
      ack?.({ ok: false, message: err.message || 'Something went wrong' });
    }
  });

  socket.on(C2S.PLAYER_TOKEN_REMOVE, async (data: any, ack?: Function) => {
    try {
      if (!socket.data.playerId) {
        socket.emit('error', { code: 'NO_PLAYER', message: 'Not registered as a player' });
        ack?.({ ok: false, message: 'Not registered as a player' });
        return;
      }

      await mutate(pool, io, (client) =>
        removeToken(client, data.tokenId, socket.data.playerId)
      );
      ack?.({ ok: true });
    } catch (err: any) {
      console.error(`[player] ${err.message}`);
      socket.emit('error', { code: 'INTERNAL', message: err.message || 'Something went wrong' });
      ack?.({ ok: false, message: err.message || 'Something went wrong' });
    }
  });
}
