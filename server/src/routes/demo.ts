import { Router } from 'express';
import { findService } from '../data/services.js';
import { demoProfile } from '../data/demoCitizen.js';
import { findDigiLockerDocument, toDocument } from '../services/digilockerService.js';
import { readinessFor } from '../domain/sessionReadiness.js';
import { sessionRepository } from '../repositories/sessionRepository.js';
import { sessionIdFrom } from './index.js';
import { NotFound } from '../middleware/errorHandler.js';

export const demoRouter: Router = Router();

/** Locker documents the seeded citizen has already pulled in. */
const SEEDED_LOCKER_DOCUMENTS = ['dl-aadhaar', 'dl-class-10'];

/**
 * Puts the session exactly where the demo starts: questions answered, identity,
 * address and date-of-birth covered from the simulated locker, and nothing yet
 * for income or the photograph.
 *
 * That is deliberate. It is the state where the first configured stop is the
 * one worth showing - the income document, at the enclosures step.
 */
demoRouter.post('/seed', (req, res) => {
  const service = findService('income-certificate');
  if (!service) throw new NotFound('The demo service is not configured.');

  const id = sessionIdFrom(req);
  sessionRepository.reset(id);

  const documents = SEEDED_LOCKER_DOCUMENTS.map((documentId) => {
    const record = findDigiLockerDocument(documentId);
    if (!record) throw new NotFound('A seeded locker document is missing.');
    return toDocument(record);
  });

  const seeded = sessionRepository.update(id, {
    profile: demoProfile(),
    documents,
    digiLockerConnected: true,
    digiLockerAccount: {
      holderName: `Demo Citizen (${demoProfile().fullName})`,
      maskedId: 'demo-locker-0000',
      connectedAt: new Date().toISOString(),
      synthetic: true,
    },
  });

  const { readiness, autopsy, session } = readinessFor(seeded, service);
  res.json({ session, readiness, autopsy, serviceId: service.id });
});

/** Back to an empty session, without the judge clearing browser storage. */
demoRouter.post('/reset', (req, res) => {
  res.json(sessionRepository.reset(sessionIdFrom(req)));
});
