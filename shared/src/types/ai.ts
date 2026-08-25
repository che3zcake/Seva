export interface AIExplanation {
  answer: string;
  /** Always present. Never let the UI render an answer without it. */
  disclaimer: string;
  /** 'fallback' means the deterministic writer answered, not a model. */
  source: 'ai' | 'fallback';
  /**
   * The literal text sent to the model, so the citizen can read it.
   * A privacy claim nobody can check is just a slogan.
   */
  sentToModel?: string;
}

export interface AIExplainRequest {
  serviceId: string;
  /** Where in the journey the question came from. */
  context: string;
  question: string;
  relevantRequirement?: string;
}
