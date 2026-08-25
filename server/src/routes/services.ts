import { Router } from 'express';
import type { ServiceSummary } from '@taiyaar/shared';
import { SERVICES, findService } from '../data/services.js';
import { NotFound } from '../middleware/errorHandler.js';

export const servicesRouter: Router = Router();

servicesRouter.get('/', (_req, res) => {
  const summaries: ServiceSummary[] = SERVICES.map((service) => ({
    id: service.id,
    name: service.name,
    shortDescription: service.shortDescription,
    category: service.category,
    jurisdiction: service.jurisdiction,
    status: service.status,
    estimatedMinutes: service.estimatedMinutes,
    documentCount: service.requirements.filter((r) => r.type === 'document').length,
    informationCount: service.requirements.filter((r) => r.type === 'information').length,
  }));
  res.json(summaries);
});

servicesRouter.get('/:serviceId', (req, res) => {
  const service = findService(req.params.serviceId);
  if (!service) throw new NotFound('We do not have that service in this prototype.');
  res.json(service);
});

servicesRouter.get('/:serviceId/requirements', (req, res) => {
  const service = findService(req.params.serviceId);
  if (!service) throw new NotFound('We do not have that service in this prototype.');
  res.json(service.requirements);
});
