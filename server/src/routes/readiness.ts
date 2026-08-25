import { Router } from 'express';
import type { ReadinessItem } from '@seva/shared';
import { findService } from '../data/services.js';
import { readinessFor } from '../domain/sessionReadiness.js';
import { sessionRepository, setProfile, markIssueResolved } from '../repositories/sessionRepository.js';
import { fromPageSchema, profilePatchSchema, readinessCheckSchema, resolveIssueSchema } from '../schemas/index.js';
import { sessionIdFrom } from './index.js';
import { NotFound } from '../middleware/errorHandler.js';

export const readinessRouter: Router = Router();

readinessRouter.get('/:serviceId', (req, res) => {
  const service = findService(req.params.serviceId);
  if (!service) throw new NotFound('We do not have that service in this prototype.');
  const session = sessionRepository.getOrCreate(sessionIdFrom(req));
  const { readiness, session: updated } = readinessFor(session, service);
  res.json({ readiness, session: updated });
});

/** Same answer, but lets the client save profile answers in the same call. */
readinessRouter.post('/check', (req, res) => {
  const { serviceId, profile } = readinessCheckSchema.parse(req.body);
  const service = findService(serviceId);
  if (!service) throw new NotFound('We do not have that service in this prototype.');

  const id = sessionIdFrom(req);
  let session = sessionRepository.getOrCreate(id);
  if (profile) {
    session = sessionRepository.update(id, { profile: setProfile(session, profile) });
  }
  const { readiness, session: updated } = readinessFor(session, service);
  res.json({ readiness, session: updated });
});

readinessRouter.patch('/profile', (req, res) => {
  const patch = profilePatchSchema.parse(req.body);
  const id = sessionIdFrom(req);
  const session = sessionRepository.getOrCreate(id);
  res.json(sessionRepository.update(id, { profile: setProfile(session, patch) }));
});

/** The citizen confirming "yes, that is me" on a flagged document. */
readinessRouter.post('/resolve-issue', (req, res) => {
  const { issueId } = resolveIssueSchema.parse(req.body);
  const id = sessionIdFrom(req);
  const session = sessionRepository.getOrCreate(id);

  const issue = session.issues.find((candidate) => candidate.id === issueId);
  if (!issue) throw new NotFound('That item is no longer flagged.');
  if (!issue.resolvable) {
    res.status(400).json({
      error: {
        code: 'not_resolvable',
        message: 'This one cannot be confirmed away.',
        action: 'Use a document that carries your own name instead.',
      },
    });
    return;
  }

  res.json(sessionRepository.update(id, { issues: markIssueResolved(session.issues, issueId) }));
});

/**
 * The hook a browser extension would use later: a portal page reports the
 * requirement labels it can see, and gets back the same readiness view.
 * Nothing in the website depends on this - it exists so the integration does
 * not need a backend redesign.
 */
readinessRouter.post('/from-page', (req, res) => {
  const { serviceId, detectedRequirements } = fromPageSchema.parse(req.body);
  const service = findService(serviceId ?? 'income-certificate');
  if (!service) throw new NotFound('We do not have that service in this prototype.');

  const session = sessionRepository.getOrCreate(sessionIdFrom(req));
  const { readiness } = readinessFor(session, service);

  const matched: { detected: string; item: ReadinessItem | null }[] = detectedRequirements.map(
    (detected) => {
      const needle = detected.label.toLowerCase();
      const item =
        readiness.items.find((candidate) => needle.includes(candidate.title.toLowerCase())) ??
        readiness.items.find((candidate) => candidate.title.toLowerCase().includes(needle)) ??
        null;
      return { detected: detected.label, item };
    },
  );

  res.json({
    readiness,
    matched,
    unmatched: matched.filter((entry) => entry.item === null).map((entry) => entry.detected),
  });
});
