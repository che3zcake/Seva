import { Router } from 'express';
import { sessionRepository, addDocument } from '../repositories/sessionRepository.js';
import {
  connectDigiLocker,
  findDigiLockerDocument,
  listDigiLockerDocuments,
  toDocument,
} from '../services/digilockerService.js';
import { digiLockerSelectSchema } from '../schemas/index.js';
import { sessionIdFrom } from './index.js';
import { NotFound, asyncHandler } from '../middleware/errorHandler.js';

export const digilockerRouter: Router = Router();

digilockerRouter.get('/documents', (_req, res) => {
  res.json(listDigiLockerDocuments());
});

digilockerRouter.post(
  '/connect',
  asyncHandler(async (req, res) => {
    const id = sessionIdFrom(req);
    const account = await connectDigiLocker();
    const session = sessionRepository.update(id, {
      digiLockerConnected: true,
      digiLockerAccount: account,
    });
    res.json({ account, documents: listDigiLockerDocuments(), session });
  }),
);

digilockerRouter.post('/select', (req, res) => {
  const { documentIds } = digiLockerSelectSchema.parse(req.body);
  const id = sessionIdFrom(req);
  let session = sessionRepository.getOrCreate(id);

  for (const documentId of documentIds) {
    const record = findDigiLockerDocument(documentId);
    if (!record) throw new NotFound('That document is not in the simulated locker.');
    session = sessionRepository.update(id, {
      documents: addDocument(session, toDocument(record)),
    });
  }

  res.json(session);
});

/** Lets the citizen drop a locker document they picked by mistake. */
digilockerRouter.delete('/select/:documentId', (req, res) => {
  const id = sessionIdFrom(req);
  const session = sessionRepository.getOrCreate(id);
  res.json(
    sessionRepository.update(id, {
      documents: session.documents.filter((doc) => doc.id !== req.params.documentId),
    }),
  );
});
