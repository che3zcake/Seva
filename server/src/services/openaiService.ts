import OpenAI from 'openai';
import type { AIExplanation, DocumentIssue, ServiceDefinition } from '@seva/shared';
import {
  AI_DISCLAIMER,
  MockAIService,
  type AIService,
  type ContextualQuestionInput,
  type ExplainIssueInput,
  type ExplainRequirementInput,
} from './aiService.js';
import { env } from '../config/env.js';

/**
 * What each detected problem means, written without reference to any citizen.
 *
 * The deterministic detail strings quote real names; these do not. This map is
 * the only description of an issue that is ever allowed off the server.
 */
const ISSUE_DESCRIPTION: Record<DocumentIssue['code'], string> = {
  'name-variant':
    'The name printed on one of their documents is written differently from the name they entered for the application - typically an extra or missing middle name, or the parts in a different order. Usually the same person written two ways.',
  'name-mismatch':
    'The name on the document does not appear to belong to the citizen at all - it looks like someone else entirely.',
  'address-mismatch':
    'The PIN code on the document is different from the PIN code of the address they entered, so the document may cover a different area.',
  unreadable: 'The document could not be read.',
};

/**
 * The facts block for a flagged document.
 *
 * issue.detail quotes the citizen's name and the name printed on their
 * document. It is written for them to read on their own screen and must not
 * leave the server, so this is built from the issue CODE instead - which says
 * everything the model needs in order to explain the situation.
 *
 * Exported so the guarantee can be tested rather than asserted.
 */
export function buildIssueFacts(service: ServiceDefinition, issue: DocumentIssue): string {
  return [
    `Service: ${service.name}`,
    `Problem found by the prototype: ${ISSUE_DESCRIPTION[issue.code]}`,
    `Can the citizen clear this themselves: ${issue.resolvable ? 'yes, by confirming it' : 'no, they need a different document'}`,
    'The citizen can see the specific names involved on their own screen. You cannot, and you do not need to. Explain the situation generally.',
  ].join('\n');
}

const SYSTEM_PROMPT = `You explain Indian government service requirements to citizens inside a prototype called Seva.

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
    const facts = buildIssueFacts(service, issue);

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
    const prompt = `FACTS\n${facts}\n\nQUESTION\n${question}`;
    try {
      const response = await this.client.responses.create({
        model: env.OPENAI_MODEL,
        instructions: SYSTEM_PROMPT,
        input: prompt,
        max_output_tokens: 400,
      });

      const answer = response.output_text?.trim();
      if (!answer) return onFailure();
      return { answer, disclaimer: AI_DISCLAIMER, source: 'ai', sentToModel: prompt };
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
