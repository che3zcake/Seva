import type { Document, DigiLockerAccount } from './document.js';
import type { CitizenProfile } from './service.js';
import type { DocumentIssue } from './readiness.js';
import type { Application } from './application.js';

/** Everything the client needs to redraw the journey after a page refresh. */
export interface SessionState {
  id: string;
  profile: CitizenProfile;
  documents: Document[];
  digiLockerConnected: boolean;
  digiLockerAccount?: DigiLockerAccount;
  issues: DocumentIssue[];
  application?: Application;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    /** What the citizen can do about it. Never a stack trace. */
    action?: string;
  };
}
