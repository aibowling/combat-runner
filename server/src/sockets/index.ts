import { Server } from 'socket.io';
import type http from 'http';
import pg from 'pg';
import { v4 as uuid } from 'uuid';
import { extractSessionId } from './auth.js';
import { checkRateLimit } from './rateLimit.js';
import { registerDmHandlers } from './dmHandlers.js';
import { registerPlayerHandlers } from './playerHandlers.js';
import { loadGameState } from '../state.js';
import { C2S, S2C, MAX_NAME_LENGTH, type HelloPayload, type HelloAck } from '../shared/types.js';
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

            const state = await loadGameState(client, io);
            const vResult = await client.query('SELECT version FROM game_state WHERE id = 1');
            ack?.({ ok: true, sessionId, isDm: true, state, version: vResult.rows[0].version });

            io.emit(S2C.SELF_UPDATE, { isDm: true });
          } else {
            let playerName = (data.name || '').trim().slice(0, MAX_NAME_LENGTH);
            if (!playerName) {
              ack?.({ ok: false, sessionId, isDm: false, state: await loadGameState(client, io), version: 0, message: 'Name is required' });
              return;
            }

            let playerRow = await client.query('SELECT * FROM players WHERE session_id = $1', [sessionId]);

            if (playerRow.rows.length === 0) {
              let displayName = playerName;
              let suffix = 1;
              while (true) {
                try {
                  const result = await client.query(
                    'INSERT INTO players (display_name, session_id) VALUES ($1, $2) RETURNING *',
                    [displayName, sessionId]
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

            const player = playerRow.rows[0];
            socket.data.playerId = player.id;
            socket.data.playerName = player.display_name;

            const state = await loadGameState(client, io);
            const vResult = await client.query('SELECT version FROM game_state WHERE id = 1');
            ack?.({
              ok: true,
              sessionId,
              playerId: player.id,
              isDm: false,
              state,
              version: vResult.rows[0].version,
            });
          }
        } finally {
          client.release();
        }

        registerDmHandlers(socket, pool, io);
        registerPlayerHandlers(socket, pool, io);

        setTimeout(() => emitFullState(io, pool).catch(console.error), 100);
      } catch (err: any) {
        console.error('[hello]', err);
        ack?.({ ok: false, sessionId: socket.data.sessionId || '', isDm: false, state: { currentTurn: 1, roundEnded: false, roundStarted: false, reactionBoxes: [], players: [], queue: [] }, version: 0, message: 'Server error' });
      }
    });

    socket.on('disconnect', () => {
      setTimeout(() => emitFullState(io, pool).catch(console.error), 100);
    });
  });

  return io;
}
