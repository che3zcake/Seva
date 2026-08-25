import type { DocumentSource } from './document.js';
import type { RequirementCategory } from './service.js';

export type ReadinessStatus = 'ready' | 'needs-review' | 'missing';

export type IssueSeverity = 'blocking' | 'review';

export interface DocumentIssue {
  id: string;
  code: 'name-variant' | 'name-mismatch' | 'address-mismatch' | 'unreadable';
  documentId: string;
  documentName: string;
  requirementId?: string;
  title: string;
  /** Deterministic description. AI may re-explain it, never replace it. */
  detail: string;
  severity: IssueSeverity;
  /** True when the citizen can clear this by confirming it themselves. */
  resolvable: boolean;
  resolved: boolean;
  /** What the citizen is being asked to confirm. */
  resolutionPrompt?: string;
}

export interface ReadinessItem {
  requirementId: string;
  title: string;
  description: string;
  type: 'document' | 'information';
  category: RequirementCategory;
  status: ReadinessStatus;
  /** Why it has this status, in plain language. */
  reason: string;
  source?: DocumentSource;
  matchedDocumentId?: string;
  matchedDocumentName?: string;
  /** What to do next when this is not ready. */
  guidance: string[];
  issueIds: string[];
}

export interface ReadinessResult {
  serviceId: string;
  serviceName: string;
  totalRequirements: number;
  satisfiedRequirements: number;
  needsReview: number;
  /** An array so callers can list exactly what is missing. */
  missingRequirements: ReadinessItem[];
  readinessPercentage: number;
  items: ReadinessItem[];
  blockingIssues: DocumentIssue[];
  recommendations: string[];
  readyToApply: boolean;
  /** One-sentence summary for the top of the readiness screen. */
  summary: string;
  documentsReady: number;
  documentsTotal: number;
  informationReady: number;
  informationTotal: number;
}

/**
 * Input shape for the future browser-extension integration: a portal page
 * reports the requirements it can see, we answer with the same readiness view.
 */
export interface DetectedRequirement {
  label: string;
  hint?: string;
}
