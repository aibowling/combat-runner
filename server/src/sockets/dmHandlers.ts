import type { Socket, Server } from 'socket.io';
import pg from 'pg';
import { C2S, S2C } from '../shared/types.js';
import { mutate, clearUndoSnapshot } from '../mutations/mutate.js';
import { createBox, updateBox, deleteBox } from '../mutations/editBox.js';
import { addNpcTokens } from '../mutations/addNpcTokens.js';
import { addPlayerToken } from '../mutations/addPlayerToken.js';
import { advanceTurn } from '../mutations/advanceTurn.js';
import { removeToken } from '../mutations/removeToken.js';
import { endRound } from '../mutations/endRound.js';
import { startRound } from '../mutations/startRound.js';
import { newCombat } from '../mutations/newCombat.js';
import { newSession } from '../mutations/newSession.js';
import { copyPreviousNpcs } from '../mutations/copyPreviousNpcs.js';
import { undo } from '../mutations/undo.js';

function isDm(socket: Socket, dmSessionId: string | null): boolean {
  return !!dmSessionId && socket.data.sessionId === dmSessionId;
}

async function getDmSessionId(pool: pg.Pool): Promise<string | null> {
  const { rows } = await pool.query('SELECT dm_session_id FROM game_state WHERE id = 1');
  return rows[0]?.dm_session_id ?? null;
}

function wrapDm(
  socket: Socket,
  pool: pg.Pool,
  io: Server,
  handler: (pool: pg.Pool, io: Server, ...args: any[]) => Promise<void>
) {
  return async (...args: any[]) => {
    const ack = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null;
    try {
      const dmSid = await getDmSessionId(pool);
      if (!isDm(socket, dmSid)) {
        socket.emit('error', { code: 'FORBIDDEN', message: 'Not the DM' });
        ack?.({ ok: false, message: 'Not the DM' });
        return;
      }
      await handler(pool, io, ...args);
      ack?.({ ok: true });
    } catch (err: any) {
      console.error(`[dm] ${err.message}`);
      socket.emit('error', { code: 'INTERNAL', message: err.message || 'Something went wrong' });
      ack?.({ ok: false, message: err.message || 'Something went wrong' });
    }
  };
}

export function registerDmHandlers(socket: Socket, pool: pg.Pool, io: Server) {
  socket.on(C2S.DM_BOX_CREATE, wrapDm(socket, pool, io, async (pool, io, data) => {
    await mutate(pool, io, (client) => createBox(client, data.label));
  }));

  socket.on(C2S.DM_BOX_UPDATE, wrapDm(socket, pool, io, async (pool, io, data) => {
    await mutate(pool, io, (client) => updateBox(client, data.boxId, data.label, data.values, data.bonus, data.armor));
  }));

  socket.on(C2S.DM_BOX_DELETE, wrapDm(socket, pool, io, async (pool, io, data) => {
    await mutate(pool, io, (client) => deleteBox(client, data.boxId));
  }));

  socket.on(C2S.DM_TOKEN_ADD_NPC, wrapDm(socket, pool, io, async (pool, io, data) => {
    await mutate(pool, io, (client) => addNpcTokens(client, data.name, data.count));
  }));

  socket.on(C2S.DM_TOKEN_ADD_FOR_PLAYER, wrapDm(socket, pool, io, async (pool, io, data) => {
    const player = await pool.query('SELECT display_name FROM players WHERE id = $1', [data.playerId]);
    if (player.rows.length === 0) throw new Error('Player not found');
    await mutate(pool, io, (client) =>
      addPlayerToken(client, data.playerId, player.rows[0].display_name, data.kind, data.name)
    );
  }));

  socket.on(C2S.DM_ADVANCE, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => advanceTurn(client));
  }));

  socket.on(C2S.DM_TOKEN_REMOVE, wrapDm(socket, pool, io, async (pool, io, data) => {
    await mutate(pool, io, (client) => removeToken(client, data.tokenId));
  }));

  socket.on(C2S.DM_END_ROUND, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => endRound(client));
  }));

  socket.on(C2S.DM_START_ROUND, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => startRound(client));
  }));

  socket.on(C2S.DM_NEW_COMBAT, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => newCombat(client));
  }));

  socket.on(C2S.DM_NEW_SESSION, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => newSession(client));
    clearUndoSnapshot();
    io.emit(S2C.SESSION_RESET, {});
  }));

  socket.on(C2S.DM_COPY_PREVIOUS_NPCS, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => copyPreviousNpcs(client));
  }));

  socket.on(C2S.DM_UNDO, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => undo(client));
  }));
}
