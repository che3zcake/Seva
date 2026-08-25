import OpenAI from 'openai';
import type { AIExplanation } from '@taiyaar/shared';
import {
  AI_DISCLAIMER,
  MockAIService,
  type AIService,
  type ContextualQuestionInput,
  type ExplainIssueInput,
  type ExplainRequirementInput,
} from './aiService.js';
import { env } from '../config/env.js';

const SYSTEM_PROMPT = `You explain Indian government service requirements to citizens inside a prototype called Taiyaar.

Rules, in order of importance:
1. The FACTS block is the only source of truth. Never introduce a requirement, document, deadline, fee or office that is not in it.
2. If you do not know something, say the prototype does not cover it. Do not guess.
3. Never claim any government body will accept a document. Say what the prototype's checklist allows.
4. Never state or imply that this is an official service.
5. Write for someone filling a form for the first time. Short sentences, plain words, no bureaucratic phrasing.
6. Answer in at most 120 words. No headings, no markdown bold. Short bullet lines are fine.`;

/**
 * Talks to OpenAI when a key is configured, and quietly hands back to the
 * deterministic writer when anything goes wrong. The citizen-facing flow never
 * depends on this class being reachable.
 */
export class OpenAIService implements AIService {
  private readonly client: OpenAI;
  private readonly fallback = new MockAIService();

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async explainRequirement(input: ExplainRequirementInput): Promise<AIExplanation> {
    const { service, requirement } = input;
    const facts = [
      `Service: ${service.name} (${service.jurisdiction})`,
      `Requirement: ${requirement.title}`,
      `Description: ${requirement.description}`,
      `Official-checklist explanation: ${requirement.explanation}`,
      requirement.type === 'document'
        ? `Documents the prototype accepts here: ${requirement.examples.join(', ')}`
        : '',
      `What to do if missing: ${requirement.resolutionGuidance.join(' ')}`,
    ]
      .filter(Boolean)
      .join('\n');

    return this.ask(
      facts,
      `Explain why this is needed and what counts, for someone who has never applied before.`,
      () => this.fallback.explainRequirement(input),
    );
  }

  async explainDocumentIssue(input: ExplainIssueInput): Promise<AIExplanation> {
    const { service, issue } = input;
    const facts = [
      `Service: ${service.name}`,
      `Problem found by the prototype: ${issue.title}`,
      `Details: ${issue.detail}`,
      `Can the citizen clear this themselves: ${issue.resolvable ? 'yes, by confirming it' : 'no, they need a different document'}`,
    ].join('\n');

    return this.ask(
      facts,
      'Explain the problem in plain language and say what to do about it.',
      () => this.fallback.explainDocumentIssue(input),
    );
  }

  async answerContextualQuestion(input: ContextualQuestionInput): Promise<AIExplanation> {
    const { service, question, context, requirement, readinessSummary } = input;
    const facts = [
      `Service: ${service.name} (${service.jurisdiction})`,
      `Where the citizen is right now: ${context}`,
      readinessSummary ? `Their current readiness: ${readinessSummary}` : '',
      `Every requirement in this service: ${service.requirements
        .map((r) => `${r.title} - ${r.explanation}`)
        .join(' | ')}`,
      requirement ? `They are looking at: ${requirement.title}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return this.ask(facts, question, () => this.fallback.answerContextualQuestion(input));
  }

  private async ask(
    facts: string,
    question: string,
    onFailure: () => Promise<AIExplanation>,
  ): Promise<AIExplanation> {
    try {
      const response = await this.client.responses.create({
        model: env.OPENAI_MODEL,
        instructions: SYSTEM_PROMPT,
        input: `FACTS\n${facts}\n\nQUESTION\n${question}`,
        max_output_tokens: 400,
      });

      const answer = response.output_text?.trim();
      if (!answer) return onFailure();
      return { answer, disclaimer: AI_DISCLAIMER, source: 'ai' };
    } catch (error) {
      console.error('[ai] falling back to deterministic answer:', (error as Error).message);
      return onFailure();
    }
  }
}

let cached: AIService | undefined;

/** One instance, chosen once, based on whether a key was configured. */
export function getAIService(): AIService {
  if (!cached) {
    cached = env.OPENAI_API_KEY ? new OpenAIService(env.OPENAI_API_KEY) : new MockAIService();
    console.log(
      env.OPENAI_API_KEY
        ? `[ai] using OpenAI (${env.OPENAI_MODEL})`
        : '[ai] no OPENAI_API_KEY set - using the built-in deterministic explanations',
    );
  }
  return cached;
}
