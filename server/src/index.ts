import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { createPool, runMigrations } from './db.js';
import { registerSessionRoute } from './session.js';
import { createSocketServer } from './sockets/index.js';

async function main() {
  const pool = createPool();
  await runMigrations(pool);
  console.log('Migrations complete');

  const app = Fastify({ trustProxy: true });

  const frontendUrl = process.env.FRONTEND_URL || process.env.APP_ORIGIN || '';
  const allowedOrigins = [
    frontendUrl,
    'http://localhost:5173',
    `http://localhost:${process.env.PORT || 3000}`,
  ].filter(Boolean);

  await app.register(fastifyCors, {
    origin: allowedOrigins,
    credentials: true,
  });

  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || 'dev-secret',
  });

  registerSessionRoute(app, pool);

  // Health check
  app.get('/api/health', async () => ({ ok: true }));

  const port = parseInt(process.env.PORT || '3000', 10);

  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Server listening on :${port}`);

  const httpServer = app.server;
  const io = createSocketServer(httpServer, pool);

  // Static file serving — only if client/dist exists (single-service deploy)
  const clientDist = path.resolve(process.cwd(), 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    await app.register(fastifyStatic, {
      root: clientDist,
      prefix: '/',
      wildcard: false,
      decorateReply: false,
    });

    app.setNotFoundHandler((_req, reply) => {
      reply.sendFile('index.html', clientDist);
    });
    console.log('Serving static frontend from client/dist');
  }

  const shutdown = async () => {
    console.log('Shutting down...');
    const timer = setTimeout(() => process.exit(1), 10000);
    timer.unref();

    io.close();
    await app.close();
    await pool.end();
    clearTimeout(timer);
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
