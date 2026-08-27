import type { DocumentIssue, ReadinessStatus } from './readiness.js';

/**
 * A configured place the *simulated* journey stops.
 *
 * These are demonstration rules written for this prototype. They are not a
 * prediction of what any government office would do, and the wording
 * throughout is chosen to keep that distinction impossible to miss.
 */
export interface RejectionRule {
  id: string;
  requirementId: string;
  /** When set, the rule only fires for that specific unresolved issue. */
  issueCode?: DocumentIssue['code'];
  /** Which step of the mock form this would stop at. */
  mockStepId: string;
  mockStepTitle: string;
  /** Explicit ordering. Never rely on array position. */
  order: number;
  /** Wording for the "nothing attached" case. */
  simulatedMessage: string;
  /**
   * Wording when a document IS attached but is flagged. Without this the
   * missing-case message contradicts readiness in the same payload.
   */
  reviewMessage?: string;
}

export interface RejectionFinding {
  ruleId: string;
  requirementId: string;
  requirementTitle: string;
  mockStepId: string;
  mockStepTitle: string;
  order: number;
  status: Exclude<ReadinessStatus, 'ready'>;
  /** The configured message for this simulated stop. */
  simulatedMessage: string;
  /** Why readiness says this is not settled, in the citizen's words. */
  reason: string;
  /** Shortest route out, reused from the requirement's own guidance. */
  fixSteps: string[];
  issueCode?: DocumentIssue['code'];
  issueId?: string;
  /** Whether the citizen can clear this themselves by confirming it. */
  issueResolvable?: boolean;
}

export interface RejectionAutopsy {
  /** Always true. There is no non-simulated mode. */
  simulated: true;
  /** Which synthetic ruleset produced this. */
  rulesetVersion: string;
  /** The first place the simulated journey would stop, if any. */
  firstFailure: RejectionFinding | null;
  findings: RejectionFinding[];
  /** Taken from readiness.readyToApply - never inferred from an empty list. */
  clear: boolean;
  /**
   * Unsettled requirements with no configured rule. The preview is unavailable
   * for these; the UI says so rather than inventing a stop.
   */
  unmappedRequirementIds: string[];
  disclaimer: string;
}
