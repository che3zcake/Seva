import type { AIExplanation } from '@seva/shared';
import { apiSend } from '../api/client';

export function explainRequirement(
  serviceId: string,
  requirementId: string,
): Promise<AIExplanation> {
  return apiSend<AIExplanation>('/ai/explain-requirement', 'POST', {
    serviceId,
    relevantRequirement: requirementId,
  });
}

export function askQuestion(input: {
  serviceId: string;
  question: string;
  context: string;
  relevantRequirement?: string;
}): Promise<AIExplanation> {
  return apiSend<AIExplanation>('/ai/explain', 'POST', input);
}
