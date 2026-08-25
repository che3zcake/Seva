import type { DocumentSource } from './document.js';

export type ApplicationStatus = 'draft' | 'submitted';

export interface AttachedDocument {
  requirementId: string;
  requirementTitle: string;
  documentId: string;
  documentName: string;
  source: DocumentSource;
}

export interface Application {
  id: string;
  serviceId: string;
  serviceName: string;
  status: ApplicationStatus;
  currentStepIndex: number;
  values: Record<string, string>;
  attachedDocuments: AttachedDocument[];
  createdAt: string;
  submittedAt?: string;
  /** Fake acknowledgement number, e.g. "DEMO-IC-48291". */
  referenceId?: string;
}
