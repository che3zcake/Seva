import type {
  AIExplanation,
  DocumentIssue,
  Requirement,
  ServiceDefinition,
} from '@taiyaar/shared';

export interface ExplainRequirementInput {
  service: ServiceDefinition;
  requirement: Requirement;
}

export interface ExplainIssueInput {
  service: ServiceDefinition;
  issue: DocumentIssue;
}

export interface ContextualQuestionInput {
  service: ServiceDefinition;
  question: string;
  /** Where the citizen is: "document checklist", "application step 2", etc. */
  context: string;
  requirement?: Requirement;
  readinessSummary?: string;
}

export interface AIService {
  explainRequirement(input: ExplainRequirementInput): Promise<AIExplanation>;
  explainDocumentIssue(input: ExplainIssueInput): Promise<AIExplanation>;
  answerContextualQuestion(input: ContextualQuestionInput): Promise<AIExplanation>;
}

export const AI_DISCLAIMER =
  'The requirements themselves come from this prototype’s service data. AI only explains them.';

export const FALLBACK_DISCLAIMER =
  'Written from this prototype’s service checklist. This is a demonstration, not official guidance.';

const STOP_WORDS = new Set([
  'what', 'why', 'how', 'do', 'does', 'is', 'are', 'the', 'a', 'an', 'i', 'need',
  'this', 'that', 'for', 'to', 'of', 'my', 'me', 'and', 'can', 'should', 'it',
  'you', 'mean', 'means', 'if', 'in', 'on', 'with', 'have', 'has', 'am', 'be',
]);

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

/** Finds the requirement a free-text question is most likely about. */
export function guessRequirement(
  service: ServiceDefinition,
  question: string,
): Requirement | undefined {
  const asked = keywords(question);
  if (asked.length === 0) return undefined;

  let best: { requirement: Requirement; score: number } | undefined;
  for (const requirement of service.requirements) {
    const haystack = keywords(
      `${requirement.title} ${requirement.description} ${
        requirement.type === 'document' ? requirement.examples.join(' ') : ''
      }`,
    );
    const score = asked.filter((word) => haystack.includes(word)).length;
    if (score > 0 && (!best || score > best.score)) best = { requirement, score };
  }
  return best?.requirement;
}

function bullets(lines: readonly string[]): string {
  return lines.map((line) => `• ${line}`).join('\n');
}

/**
 * The answer written without a model.
 *
 * This is not a placeholder - it is the default. Every answer it gives is
 * assembled from the same service data the checklist uses, so it can never
 * contradict the requirements. The demo runs entirely on this when no
 * OPENAI_API_KEY is set.
 */
export class MockAIService implements AIService {
  async explainRequirement({ requirement }: ExplainRequirementInput): Promise<AIExplanation> {
    const parts = [requirement.explanation];
    if (requirement.type === 'document' && requirement.examples.length > 0) {
      parts.push(`Any one of these usually works:\n${bullets(requirement.examples)}`);
    }
    if (requirement.resolutionGuidance.length > 0) {
      parts.push(`If you do not have it yet:\n${bullets(requirement.resolutionGuidance)}`);
    }
    return { answer: parts.join('\n\n'), disclaimer: FALLBACK_DISCLAIMER, source: 'fallback' };
  }

  async explainDocumentIssue({ issue }: ExplainIssueInput): Promise<AIExplanation> {
    const next = issue.resolvable
      ? 'If it is the same person, confirm it here and carry on. The office may still ask about it later, but you will know it is coming.'
      : 'This one cannot be confirmed away. Use a document that carries your own name instead.';
    return {
      answer: `${issue.detail}\n\n${next}`,
      disclaimer: FALLBACK_DISCLAIMER,
      source: 'fallback',
    };
  }

  async answerContextualQuestion(input: ContextualQuestionInput): Promise<AIExplanation> {
    const { service, question } = input;
    const asked = question.toLowerCase();

    if (/digilocker|locker/.test(asked)) {
      return this.canned(
        'DigiLocker is where many people already keep digital copies of documents like Aadhaar and school certificates.\n\nIn this prototype the locker is simulated: nothing is fetched from a real account, and every document you see is made-up sample data.',
      );
    }
    if (/real|official|actual|government|genuine|legit/.test(asked)) {
      return this.canned(
        'This is a prototype, not a government service. Nothing here is submitted anywhere, and the requirement list is demonstration data written for the demo.\n\nThe idea being shown is the preparation step: finding out what you need before you start filling a long form.',
      );
    }
    if (/how long|time|minutes|duration/.test(asked)) {
      return this.canned(
        `Preparing takes a few minutes. The mock form after it is about ${service.estimatedMinutes} minutes.\n\nThe point of preparing first is that those minutes are not wasted - you will not get halfway and find a document missing.`,
      );
    }
    if (/ready|start|begin|apply/.test(asked)) {
      return this.canned(
        'You are ready once every document has been found or uploaded, every question is answered, and nothing is flagged for review.\n\nUntil then the checklist shows exactly what is left, so you can deal with it before you open the form.',
      );
    }

    const requirement = input.requirement ?? guessRequirement(service, question);
    if (requirement) {
      const base = await this.explainRequirement({ service, requirement });
      return { ...base, answer: `About ${requirement.title.toLowerCase()}:\n\n${base.answer}` };
    }

    const summary = input.readinessSummary ? `\n\nRight now: ${input.readinessSummary}` : '';
    return this.canned(
      `This prototype covers one thing: getting ready for a ${service.name.toLowerCase()} application before you start it.\n\nYou can ask about any document on the checklist - what it is for, what counts, or what to do if you do not have it.${summary}`,
    );
  }

  private canned(answer: string): AIExplanation {
    return { answer, disclaimer: FALLBACK_DISCLAIMER, source: 'fallback' };
  }
}
