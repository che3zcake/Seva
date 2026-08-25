import { Router } from 'express';
import { findService } from '../data/services.js';
import { aiExplainSchema } from '../schemas/index.js';
import { getAIService } from '../services/openaiService.js';
import { guessRequirement } from '../services/aiService.js';
import { readinessFor } from '../domain/sessionReadiness.js';
import { sessionRepository } from '../repositories/sessionRepository.js';
import { sessionIdFrom } from './index.js';
import { NotFound, asyncHandler } from '../middleware/errorHandler.js';

export const aiRouter: Router = Router();

aiRouter.post(
  '/explain',
  asyncHandler(async (req, res) => {
    const { serviceId, context, question, relevantRequirement } = aiExplainSchema.parse(req.body);
    const service = findService(serviceId);
    if (!service) throw new NotFound('We do not have that service in this prototype.');

    const ai = getAIService();
    const session = sessionRepository.getOrCreate(sessionIdFrom(req));

    const requirement =
      service.requirements.find((r) => r.id === relevantRequirement) ??
      guessRequirement(service, question);

    // An open issue on the document being asked about gets the issue explainer,
    // which knows what the citizen can actually do about it.
    const issue = session.issues.find(
      (candidate) => !candidate.resolved && candidate.requirementId === relevantRequirement,
    );
    if (issue && /wrong|mismatch|different|problem|issue|name/.test(question.toLowerCase())) {
      res.json(await ai.explainDocumentIssue({ service, issue }));
      return;
    }

    const { readiness } = readinessFor(session, service);
    res.json(
      await ai.answerContextualQuestion({
        service,
        question,
        context,
        requirement,
        readinessSummary: readiness.summary,
      }),
    );
  }),
);

/** Used by the "why do I need this?" panel, which always has a requirement. */
aiRouter.post(
  '/explain-requirement',
  asyncHandler(async (req, res) => {
    const { serviceId, relevantRequirement } = aiExplainSchema.parse({
      question: 'Explain this requirement.',
      ...req.body,
    });
    const service = findService(serviceId);
    if (!service) throw new NotFound('We do not have that service in this prototype.');

    const requirement = service.requirements.find((r) => r.id === relevantRequirement);
    if (!requirement) throw new NotFound('That is not something this service asks for.');

    res.json(await getAIService().explainRequirement({ service, requirement }));
  }),
);
