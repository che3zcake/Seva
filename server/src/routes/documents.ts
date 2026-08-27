import { Router } from 'express';
import multer from 'multer';
import { findService } from '../data/services.js';
import { analyseUpload, MAX_UPLOAD_BYTES, sampleFileFor } from '../services/documentAnalysis.js';
import { sessionRepository, addDocument } from '../repositories/sessionRepository.js';
import { uploadFieldsSchema } from '../schemas/index.js';
import { sessionIdFrom } from './index.js';
import { NotFound } from '../middleware/errorHandler.js';

/**
 * Memory storage on purpose: the file is read for the simulated analysis and
 * then dropped. Nothing a citizen uploads is written to disk.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

export const documentsRouter: Router = Router();

documentsRouter.get('/', (req, res) => {
  res.json(sessionRepository.getOrCreate(sessionIdFrom(req)).documents);
});

documentsRouter.post('/upload', upload.single('file'), (req, res) => {
  const { serviceId, requirementId } = uploadFieldsSchema.parse(req.body);
  const service = findService(serviceId);
  if (!service) throw new NotFound('We do not have that service in this prototype.');

  const requirement = service.requirements.find((r) => r.id === requirementId);
  if (!requirement || requirement.type !== 'document') {
    throw new NotFound('That is not a document this service asks for.');
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({
      error: {
        code: 'no_file',
        message: 'No file came through.',
        action: 'Choose a file and try again.',
      },
    });
    return;
  }

  const id = sessionIdFrom(req);
  const session = sessionRepository.getOrCreate(id);

  const { document, analysis } = analyseUpload({
    requirement,
    profileName: session.profile.fullName,
    fileName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
  });

  const updated = sessionRepository.update(id, { documents: addDocument(session, document) });
  res.json({ document, analysis, session: updated });
});

/**
 * Adds a built-in synthetic document for a requirement, with no file involved.
 *
 * Same analysis, same issue detection, same resulting document as an upload -
 * only the file descriptor is supplied by the prototype instead of the citizen.
 */
documentsRouter.post('/sample', (req, res) => {
  const { serviceId, requirementId } = uploadFieldsSchema.parse(req.body);
  const service = findService(serviceId);
  if (!service) throw new NotFound('We do not have that service in this prototype.');

  const requirement = service.requirements.find((r) => r.id === requirementId);
  if (!requirement || requirement.type !== 'document') {
    throw new NotFound('That is not a document this service asks for.');
  }

  const id = sessionIdFrom(req);
  const session = sessionRepository.getOrCreate(id);
  const sample = sampleFileFor(requirement);

  const { document, analysis } = analyseUpload({
    requirement,
    profileName: session.profile.fullName,
    ...sample,
  });

  const updated = sessionRepository.update(id, { documents: addDocument(session, document) });
  res.json({ document, analysis, session: updated, synthetic: true });
});

documentsRouter.delete('/:documentId', (req, res) => {
  const id = sessionIdFrom(req);
  const session = sessionRepository.getOrCreate(id);
  res.json(
    sessionRepository.update(id, {
      documents: session.documents.filter((doc) => doc.id !== req.params.documentId),
    }),
  );
});
