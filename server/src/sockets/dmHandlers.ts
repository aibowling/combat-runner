import type { Socket, Server } from 'socket.io';
import pg from 'pg';
import { C2S, S2C } from '../shared/types.js';
import { mutate, clearUndoSnapshot } from '../mutations/mutate.js';
import { placeChip } from '../mutations/placeChip.js';
import { removeChip } from '../mutations/removeChip.js';
import { rollEntry } from '../mutations/rollEntry.js';
import { advanceWedge, stepBack } from '../mutations/advanceWedge.js';
import { endRound } from '../mutations/endRound.js';
import { reveal } from '../mutations/reveal.js';
import { addNpcs, removeNpc, setNpcHp, copyPreviousNpcs } from '../mutations/npcs.js';
import { createBox, updateBox, deleteBox } from '../mutations/editBox.js';
import { repeatPreviousChips } from '../mutations/repeatChips.js';
import { newCombat } from '../mutations/newCombat.js';
import { newSession } from '../mutations/newSession.js';
import { undo } from '../mutations/undo.js';

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
      // isParty matters here for the same reason it does in the broadcast: a
      // shared screen must not drive the game just because it happens to be
      // running in the browser the DM signed in from.
      if (socket.data.isParty || !dmSid || socket.data.sessionId !== dmSid) {
        socket.emit(S2C.ERROR, { code: 'FORBIDDEN', message: 'Not the DM' });
        ack?.({ ok: false, message: 'Not the DM' });
        return;
      }
      await handler(pool, io, ...args);
      ack?.({ ok: true });
    } catch (err: any) {
      console.error(`[dm] ${err.message}`);
      socket.emit(S2C.ERROR, { code: 'INTERNAL', message: err.message || 'Something went wrong' });
      ack?.({ ok: false, message: err.message || 'Something went wrong' });
    }
  };
}

export function registerDmHandlers(socket: Socket, pool: pg.Pool, io: Server) {
  socket.removeAllListeners(C2S.DM_CHIP_PLACE);
  socket.removeAllListeners(C2S.DM_CHIP_REMOVE);
  socket.removeAllListeners(C2S.DM_NPC_ADD);
  socket.removeAllListeners(C2S.DM_NPC_REMOVE);
  socket.removeAllListeners(C2S.DM_NPC_SET_HP);
  socket.removeAllListeners(C2S.DM_COPY_PREVIOUS_NPCS);
  socket.removeAllListeners(C2S.DM_REPEAT_CHIPS);
  socket.removeAllListeners(C2S.DM_BOX_CREATE);
  socket.removeAllListeners(C2S.DM_BOX_UPDATE);
  socket.removeAllListeners(C2S.DM_BOX_DELETE);
  socket.removeAllListeners(C2S.DM_REVEAL);
  socket.removeAllListeners(C2S.DM_ROLL_ENTRY);
  socket.removeAllListeners(C2S.DM_SET_ENTRY);
  socket.removeAllListeners(C2S.DM_ADVANCE);
  socket.removeAllListeners(C2S.DM_BACK);
  socket.removeAllListeners(C2S.DM_END_ROUND);
  socket.removeAllListeners(C2S.DM_NEW_COMBAT);
  socket.removeAllListeners(C2S.DM_NEW_SESSION);
  socket.removeAllListeners(C2S.DM_UNDO);

  socket.on(C2S.DM_CHIP_PLACE, wrapDm(socket, pool, io, async (pool, io, data) => {
    // The DM places enemy chips only. Players place their own — that stays true.
    if (typeof data?.npcId !== 'number') throw new Error('Pick an enemy first');
    await mutate(pool, io, (client) =>
      placeChip(client, { kind: 'npc', npcId: data.npcId }, data.wedge, data.note)
    );
  }));

  socket.on(C2S.DM_CHIP_REMOVE, wrapDm(socket, pool, io, async (pool, io, data) => {
    await mutate(pool, io, (client) => removeChip(client, data.chipId));
  }));

  socket.on(C2S.DM_NPC_ADD, wrapDm(socket, pool, io, async (pool, io, data) => {
    await mutate(pool, io, (client) => addNpcs(client, data.name, data.count ?? 1, data.hp));
  }));

  socket.on(C2S.DM_NPC_REMOVE, wrapDm(socket, pool, io, async (pool, io, data) => {
    await mutate(pool, io, (client) => removeNpc(client, data.npcId));
  }));

  socket.on(C2S.DM_NPC_SET_HP, wrapDm(socket, pool, io, async (pool, io, data) => {
    if (typeof data?.npcId !== 'number') throw new Error('Which enemy?');
    await mutate(pool, io, (client) => setNpcHp(client, data.npcId, data.hp, data.maxHp), {
      snapshot: false,
    });
  }));

  socket.on(C2S.DM_COPY_PREVIOUS_NPCS, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => copyPreviousNpcs(client));
  }));

  socket.on(C2S.DM_REPEAT_CHIPS, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => repeatPreviousChips(client));
  }));

  socket.on(C2S.DM_BOX_CREATE, wrapDm(socket, pool, io, async (pool, io, data) => {
    await mutate(pool, io, (client) => createBox(client, data?.label));
  }));

  socket.on(C2S.DM_BOX_UPDATE, wrapDm(socket, pool, io, async (pool, io, data) => {
    if (typeof data?.boxId !== 'number') throw new Error('Which box?');
    await mutate(
      pool,
      io,
      (client) => updateBox(client, data.boxId, data.label, data.values, data.bonus, data.armor),
      { snapshot: false }
    );
  }));

  socket.on(C2S.DM_BOX_DELETE, wrapDm(socket, pool, io, async (pool, io, data) => {
    if (typeof data?.boxId !== 'number') throw new Error('Which box?');
    await mutate(pool, io, (client) => deleteBox(client, data.boxId));
  }));

  socket.on(C2S.DM_REVEAL, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => reveal(client));
  }));

  socket.on(C2S.DM_ROLL_ENTRY, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => rollEntry(client));
  }));

  socket.on(C2S.DM_SET_ENTRY, wrapDm(socket, pool, io, async (pool, io, data) => {
    await mutate(pool, io, (client) => rollEntry(client, data.wedge));
  }));

  socket.on(C2S.DM_ADVANCE, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => advanceWedge(client));
  }));

  socket.on(C2S.DM_BACK, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => stepBack(client));
  }));

  socket.on(C2S.DM_END_ROUND, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => endRound(client));
  }));

  socket.on(C2S.DM_NEW_COMBAT, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => newCombat(client));
  }));

  socket.on(C2S.DM_NEW_SESSION, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => newSession(client));
    clearUndoSnapshot();
    io.emit(S2C.SESSION_RESET, {});
  }));

  socket.on(C2S.DM_UNDO, wrapDm(socket, pool, io, async (pool, io) => {
    await mutate(pool, io, (client) => undo(client));
  }));
}
