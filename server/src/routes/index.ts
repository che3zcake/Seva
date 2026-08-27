import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { sessionRepository } from '../repositories/sessionRepository.js';
import { servicesRouter } from './services.js';
import { digilockerRouter } from './digilocker.js';
import { readinessRouter } from './readiness.js';
import { documentsRouter } from './documents.js';
import { aiRouter } from './ai.js';
import { applicationRouter } from './application.js';
import { demoRouter } from './demo.js';
import { env } from '../config/env.js';

/** Sessions are identified by a header the client keeps in localStorage. */
export function sessionIdFrom(req: Request): string {
  const header = req.header('x-session-id')?.trim();
  return header && header.length > 0 ? header : randomUUID();
}

export const apiRouter: Router = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    aiMode: env.OPENAI_API_KEY ? 'openai' : 'deterministic-fallback',
    prototype: true,
  });
});

/** Bootstrap: the client calls this once and remembers the id it gets back. */
apiRouter.get('/session', (req, res) => {
  const id = sessionIdFrom(req);
  res.json(sessionRepository.getOrCreate(id));
});

apiRouter.post('/session/reset', (req, res) => {
  res.json(sessionRepository.reset(sessionIdFrom(req)));
});

apiRouter.use('/services', servicesRouter);
apiRouter.use('/digilocker', digilockerRouter);
apiRouter.use('/readiness', readinessRouter);
apiRouter.use('/documents', documentsRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/application', applicationRouter);
apiRouter.use('/demo', demoRouter);
