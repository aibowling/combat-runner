import { Server } from 'socket.io';
import type http from 'http';
import pg from 'pg';
import { v4 as uuid } from 'uuid';
import { extractSessionId } from './auth.js';
import { checkRateLimit } from './rateLimit.js';
import { registerDmHandlers } from './dmHandlers.js';
import { registerPlayerHandlers } from './playerHandlers.js';
import { loadGameState, redactState } from '../state.js';
import { C2S, S2C, MAX_NAME_LENGTH, EMPTY_STATE, type HelloPayload, type HelloAck } from '../shared/types.js';
import { emitFullState } from './broadcast.js';

export function createSocketServer(httpServer: http.Server, pool: pg.Pool): Server {
  const frontendUrl = process.env.FRONTEND_URL || process.env.APP_ORIGIN || '';

  const allowedOrigins = [
    frontendUrl,
    'http://localhost:5173',
    `http://localhost:${process.env.PORT || 3000}`,
  ].filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const sid = extractSessionId(socket);
    if (sid) {
      socket.data.sessionId = sid;
    }
    next();
  });

  io.use((socket, next) => {
    if (!socket.data.sessionId) {
      return next();
    }
    if (!checkRateLimit(socket.data.sessionId)) {
      return next(new Error('Rate limited'));
    }
    next();
  });

  io.on('connection', (socket) => {
    // Registered up front, not just after hello. A reconnecting socket is a
    // brand new one: if its handlers only went on inside hello, a client that
    // reconnected without re-identifying would tap wedges into the void.
    registerDmHandlers(socket, pool, io);
    registerPlayerHandlers(socket, pool, io);

    socket.on(C2S.HELLO, async (data: HelloPayload, ack?: (response: HelloAck) => void) => {
      try {
        let sessionId = socket.data.sessionId || data.sessionId;
        if (!sessionId) {
          sessionId = uuid();
        }
        socket.data.sessionId = sessionId;

        const client = await pool.connect();
        try {
          if (data.role === 'dm') {
            const gsResult = await client.query('SELECT dm_session_id FROM game_state WHERE id = 1');
            const currentDmSid = gsResult.rows[0]?.dm_session_id;

            // DM takeover always allowed — trusted friend group

            await client.query('UPDATE game_state SET dm_session_id = $1 WHERE id = 1', [sessionId]);
            socket.data.isDm = true;
            socket.data.playerId = undefined;
            socket.data.isParty = false;

            const state = await loadGameState(client, io);
            const vResult = await client.query('SELECT version FROM game_state WHERE id = 1');
            ack?.({
              ok: true,
              sessionId,
              isDm: true,
              role: 'dm',
              state,
              version: vResult.rows[0].version,
            });

            socket.emit(S2C.SELF_UPDATE, { isDm: true });
          } else if (data.role === 'party') {
            // The shared screen owns no chips and claims no seat. It is given
            // the same redacted view a bystander gets, which is the point —
            // the players are looking straight at it.
            socket.data.isDm = false;
            socket.data.playerId = undefined;
            socket.data.isParty = true;

            const state = await loadGameState(client, io);
            const vResult = await client.query('SELECT version FROM game_state WHERE id = 1');
            ack?.({
              ok: true,
              sessionId,
              isDm: false,
              role: 'party',
              state: redactState(state, {}),
              version: vResult.rows[0].version,
            });
          } else {
            let playerName = (data.name || '').trim().slice(0, MAX_NAME_LENGTH);
            if (!playerName) {
              ack?.({ ok: false, sessionId, isDm: false, role: 'player', state: EMPTY_STATE, version: 0, message: 'Name is required' });
              return;
            }

            let playerRow = await client.query('SELECT * FROM players WHERE session_id = $1', [sessionId]);

            if (playerRow.rows.length === 0) {
              try {
                const result = await client.query(
                  'INSERT INTO players (display_name, session_id) VALUES ($1, $2) RETURNING *',
                  [playerName, sessionId]
                );
                playerRow = result;
              } catch (err: any) {
                if (err.code === '23505' && err.constraint?.includes('display_name')) {
                  // Name takeover — trusted friend group, reassign existing row to this session
                  const result = await client.query(
                    'UPDATE players SET session_id = $1, last_seen = now() WHERE display_name = $2 RETURNING *',
                    [sessionId, playerName]
                  );
                  playerRow = result;
                } else {
                  throw err;
                }
              }
            } else {
              const existingName = playerRow.rows[0].display_name;
              if (existingName !== playerName) {
                let displayName = playerName;
                let suffix = 1;
                while (true) {
                  try {
                    const result = await client.query(
                      'UPDATE players SET display_name = $1, last_seen = now() WHERE id = $2 RETURNING *',
                      [displayName, playerRow.rows[0].id]
                    );
                    playerRow = result;
                    break;
                  } catch (err: any) {
                    if (err.code === '23505' && err.constraint?.includes('display_name')) {
                      suffix++;
                      displayName = `${playerName} (${suffix})`;
                    } else {
                      throw err;
                    }
                  }
                }
              } else {
                await client.query(
                  'UPDATE players SET last_seen = now() WHERE id = $1',
                  [playerRow.rows[0].id]
                );
              }
            }

            const player = playerRow.rows[0];
            socket.data.isDm = false;
            socket.data.playerId = player.id;
            socket.data.playerName = player.display_name;
            socket.data.isParty = false;

            const state = await loadGameState(client, io);
            const vResult = await client.query('SELECT version FROM game_state WHERE id = 1');
            ack?.({
              ok: true,
              sessionId,
              playerId: player.id,
              isDm: false,
              role: 'player',
              state: redactState(state, { playerId: player.id, isDm: false }),
              version: vResult.rows[0].version,
            });
          }
        } finally {
          client.release();
        }

        setTimeout(() => emitFullState(io, pool).catch(console.error), 100);
      } catch (err: any) {
        console.error('[hello]', err);
        ack?.({ ok: false, sessionId: socket.data.sessionId || '', isDm: false, role: data?.role ?? 'player', state: EMPTY_STATE, version: 0, message: 'Server error' });
      }
    });

    socket.on('disconnect', () => {
      setTimeout(() => emitFullState(io, pool).catch(console.error), 100);
    });
  });

  return io;
}
