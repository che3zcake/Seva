import type { DocumentType } from './document.js';

export type RequirementCategory =
  | 'identity'
  | 'address'
  | 'age'
  | 'income'
  | 'photo'
  | 'personal'
  | 'application';

interface RequirementBase {
  id: string;
  title: string;
  /** One short line. Shown on the checklist card. */
  description: string;
  required: boolean;
  category: RequirementCategory;
  /** Plain-language "why is this asked for". Deterministic, not AI-written. */
  explanation: string;
  /** Concrete steps when the citizen does not have this yet. */
  resolutionGuidance: string[];
}

export interface DocumentRequirement extends RequirementBase {
  type: 'document';
  /** Document types that may satisfy this requirement in this prototype. */
  acceptableDocumentTypes: DocumentType[];
  /** Human-readable examples for the "how do I get this" panel. */
  examples: string[];
}

export interface InformationRequirement extends RequirementBase {
  type: 'information';
  field: CitizenProfileField;
  inputType: 'text' | 'date' | 'textarea' | 'select' | 'number';
  options?: string[];
  placeholder?: string;
}

export type Requirement = DocumentRequirement | InformationRequirement;

export type CitizenProfileField =
  | 'fullName'
  | 'dateOfBirth'
  | 'address'
  | 'occupation'
  | 'annualIncome'
  | 'purpose';

export interface CitizenProfile {
  fullName: string;
  dateOfBirth: string;
  address: string;
  occupation: string;
  annualIncome: string;
  purpose: string;
}

export interface ApplicationField {
  id: string;
  label: string;
  inputType: 'text' | 'date' | 'textarea' | 'select' | 'number' | 'tel';
  required: boolean;
  helpText?: string;
  placeholder?: string;
  options?: string[];
  /** When set, the field is pre-filled from what the citizen prepared. */
  prefillFrom?: CitizenProfileField;
}

export interface ApplicationStep {
  id: string;
  title: string;
  description: string;
  /** 'documents' and 'review' steps are rendered specially. */
  kind: 'fields' | 'documents' | 'review';
  fields: ApplicationField[];
}

export interface ServiceDefinition {
  id: string;
  name: string;
  shortDescription: string;
  category: string;
  jurisdiction: string;
  /** Shown wherever the service is presented. Never optional. */
  prototypeNotice: string;
  status: 'available' | 'coming-soon';
  estimatedMinutes: number;
  requirements: Requirement[];
  applicationSteps: ApplicationStep[];
}

/** Trimmed shape for the service picker. */
export interface ServiceSummary {
  id: string;
  name: string;
  shortDescription: string;
  category: string;
  jurisdiction: string;
  status: 'available' | 'coming-soon';
  estimatedMinutes: number;
  documentCount: number;
  informationCount: number;
}
