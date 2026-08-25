import express, { type Express } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.CLIENT_URL, credentials: false }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRouter);

  // In a production build the API also serves the built client, so the whole
  // demo runs on one port.
  const clientDist = path.resolve(fileURLToPath(new URL('../../client/dist', import.meta.url)));
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
