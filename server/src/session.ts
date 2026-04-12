import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { v4 as uuid } from 'uuid';

function getSid(request: any): string | undefined {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return (request.cookies as Record<string, string>)?.sid;
}

export function registerSessionRoute(app: FastifyInstance, pool: pg.Pool) {
  app.post('/api/session', async (request, reply) => {
    const existingSid = getSid(request);

    if (existingSid) {
      const playerResult = await pool.query(
        'SELECT display_name FROM players WHERE session_id = $1',
        [existingSid]
      );
      if (playerResult.rows.length > 0) {
        return { sessionId: existingSid, role: 'player', name: playerResult.rows[0].display_name };
      }

      const dmResult = await pool.query(
        'SELECT dm_session_id FROM game_state WHERE id = 1 AND dm_session_id = $1',
        [existingSid]
      );
      if (dmResult.rows.length > 0) {
        return { sessionId: existingSid, role: 'dm' };
      }
    }

    const sessionId = uuid();
    const isProduction = process.env.NODE_ENV === 'production';
    reply.setCookie('sid', sessionId, {
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      maxAge: 86400,
      path: '/',
    });

    return { sessionId };
  });
}
