import { Router } from 'express';
import { findService } from '../data/services.js';
import { readinessFor } from '../domain/sessionReadiness.js';
import { sessionRepository } from '../repositories/sessionRepository.js';
import {
  attachDocument,
  checkSubmittable,
  startApplication,
  submitApplication,
} from '../services/applicationService.js';
import { applicationPatchSchema, applicationStartSchema } from '../schemas/index.js';
import { sessionIdFrom } from './index.js';
import { NotFound } from '../middleware/errorHandler.js';

export const applicationRouter: Router = Router();

applicationRouter.post('/start', (req, res) => {
  const { serviceId } = applicationStartSchema.parse(req.body);
  const service = findService(serviceId);
  if (!service) throw new NotFound('We do not have that service in this prototype.');

  const id = sessionIdFrom(req);
  const session = sessionRepository.getOrCreate(id);
  const { readiness } = readinessFor(session, service);

  // Throws ApplicationBlocked when anything is still unresolved.
  const application = startApplication(service, session.profile, readiness);
  res.json(sessionRepository.update(id, { application }));
});

applicationRouter.get('/:applicationId', (req, res) => {
  const session = sessionRepository.getOrCreate(sessionIdFrom(req));
  if (session.application?.id !== req.params.applicationId) {
    throw new NotFound('We could not find that application.');
  }
  res.json(session.application);
});

applicationRouter.patch('/:applicationId', (req, res) => {
  const patch = applicationPatchSchema.parse(req.body);
  const id = sessionIdFrom(req);
  const session = sessionRepository.getOrCreate(id);
  const current = session.application;
  if (current?.id !== req.params.applicationId) {
    throw new NotFound('We could not find that application.');
  }
  if (current.status === 'submitted') {
    throw new NotFound('That application has already been submitted.');
  }

  let next = {
    ...current,
    values: patch.values ? { ...current.values, ...patch.values } : current.values,
    currentStepIndex: patch.currentStepIndex ?? current.currentStepIndex,
  };

  if (patch.attachRequirementId) {
    const service = findService(current.serviceId);
    if (!service) throw new NotFound('We do not have that service in this prototype.');
    const { readiness } = readinessFor(session, service);
    const item = readiness.items.find((i) => i.requirementId === patch.attachRequirementId);
    if (!item?.matchedDocumentId) {
      throw new NotFound('There is no prepared document for that requirement.');
    }
    next = attachDocument(next, {
      requirementId: item.requirementId,
      requirementTitle: item.title,
      documentId: item.matchedDocumentId,
      documentName: item.matchedDocumentName ?? item.title,
      source: item.source ?? 'mock-system',
    });
  }

  sessionRepository.update(id, { application: next });
  res.json(next);
});

applicationRouter.get('/:applicationId/submittable', (req, res) => {
  const session = sessionRepository.getOrCreate(sessionIdFrom(req));
  const application = session.application;
  if (application?.id !== req.params.applicationId) {
    throw new NotFound('We could not find that application.');
  }
  const service = findService(application.serviceId);
  if (!service) throw new NotFound('We do not have that service in this prototype.');
  const { readiness } = readinessFor(session, service);
  res.json(checkSubmittable(service, application, readiness));
});

applicationRouter.post('/:applicationId/submit', (req, res) => {
  const id = sessionIdFrom(req);
  const session = sessionRepository.getOrCreate(id);
  const application = session.application;
  if (application?.id !== req.params.applicationId) {
    throw new NotFound('We could not find that application.');
  }
  const service = findService(application.serviceId);
  if (!service) throw new NotFound('We do not have that service in this prototype.');

  const { readiness } = readinessFor(session, service);
  const submitted = submitApplication(service, application, readiness);
  sessionRepository.update(id, { application: submitted });

  res.json({
    application: submitted,
    documentsPrepared: submitted.attachedDocuments.length,
    issuesRemaining: readiness.blockingIssues.length,
    notice:
      'This submission is simulated. No government application was actually submitted, and no data left this prototype.',
  });
});
