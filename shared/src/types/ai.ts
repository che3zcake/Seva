export interface AIExplanation {
  answer: string;
  /** Always present. Never let the UI render an answer without it. */
  disclaimer: string;
  /** 'fallback' means the deterministic writer answered, not a model. */
  source: 'ai' | 'fallback';
}

export interface AIExplainRequest {
  serviceId: string;
  /** Where in the journey the question came from. */
  context: string;
  question: string;
  relevantRequirement?: string;
}
