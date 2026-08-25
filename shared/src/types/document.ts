/**
 * Document types.
 *
 * Every document in this prototype is synthetic. Nothing here is retrieved
 * from a real government system, and `synthetic: true` is never optional.
 */

export type DocumentType =
  | 'aadhaar'
  | 'pan'
  | 'driving-licence'
  | 'voter-id'
  | 'ration-card'
  | 'utility-bill'
  | 'salary-slip'
  | 'employer-certificate'
  | 'itr'
  | 'bank-statement'
  | 'school-certificate'
  | 'birth-certificate'
  | 'photograph'
  | 'other';

export type DocumentSource = 'digilocker' | 'user-upload' | 'mock-system';

export type DocumentStatus = 'available' | 'needs-review' | 'missing' | 'invalid';

export interface DocumentMetadata {
  /** Name as it appears on the document. Used for mismatch detection. */
  holderName?: string;
  /** Always a clearly fake reference in this prototype. */
  documentNumber?: string;
  issuedOn?: string;
  address?: string;
  /** Free-form synthetic fields shown in the document detail view. */
  extra?: Record<string, string>;
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  issuer: string;
  source: DocumentSource;
  status: DocumentStatus;
  metadata: DocumentMetadata;
  /** Always true. This prototype has no route for real documents. */
  synthetic: true;
  addedAt: string;
  /** Set when the citizen uploaded this against a specific requirement. */
  forRequirementId?: string;
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
}

/** A document sitting in the simulated DigiLocker account, not yet chosen. */
export interface DigiLockerDocument {
  id: string;
  name: string;
  type: DocumentType;
  issuer: string;
  /** Fake locker reference, e.g. "DL-SYNTH-4471". */
  digilockerRef: string;
  metadata: DocumentMetadata;
  synthetic: true;
  description: string;
}

export interface DigiLockerAccount {
  holderName: string;
  maskedId: string;
  connectedAt: string;
  synthetic: true;
}

/** Result of the simulated "read the uploaded file" step. */
export interface DocumentAnalysis {
  documentId: string;
  checks: DocumentAnalysisCheck[];
  detectedName?: string;
  detectedType: DocumentType;
  /** True when at least one check came back as 'warning'. */
  needsReview: boolean;
}

export interface DocumentAnalysisCheck {
  label: string;
  status: 'pass' | 'warning' | 'fail';
  detail: string;
}
