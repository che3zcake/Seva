import type { Application, Document, DocumentIssue, SessionState } from '@taiyaar/shared';
import type { CitizenProfile } from '@taiyaar/shared';
import { createEmptyProfile } from '../data/demoCitizen.js';

/**
 * Everything a journey needs, kept per browser session.
 *
 * The interface exists so a real store can replace the Map later without the
 * routes changing. Nothing here is durable: restarting the server clears it,
 * which is the correct behaviour for a prototype holding synthetic documents.
 */
export interface SessionRepository {
  get(id: string): SessionState | undefined;
  create(id: string): SessionState;
  getOrCreate(id: string): SessionState;
  update(id: string, patch: Partial<SessionState>): SessionState;
  reset(id: string): SessionState;
}

function emptySession(id: string): SessionState {
  return {
    id,
    profile: createEmptyProfile(),
    documents: [],
    digiLockerConnected: false,
    issues: [],
  };
}

class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, SessionState>();

  get(id: string): SessionState | undefined {
    return this.sessions.get(id);
  }

  create(id: string): SessionState {
    const session = emptySession(id);
    this.sessions.set(id, session);
    return session;
  }

  getOrCreate(id: string): SessionState {
    return this.sessions.get(id) ?? this.create(id);
  }

  update(id: string, patch: Partial<SessionState>): SessionState {
    const current = this.getOrCreate(id);
    const next = { ...current, ...patch, id };
    this.sessions.set(id, next);
    return next;
  }

  reset(id: string): SessionState {
    return this.create(id);
  }
}

export const sessionRepository: SessionRepository = new InMemorySessionRepository();

/** Small helpers so routes do not hand-roll spread updates. */
export function addDocument(session: SessionState, document: Document): Document[] {
  const withoutDuplicate = session.documents.filter((d) => d.id !== document.id);
  return [...withoutDuplicate, document];
}

export function setProfile(session: SessionState, patch: Partial<CitizenProfile>): CitizenProfile {
  return { ...session.profile, ...patch };
}

export function markIssueResolved(issues: DocumentIssue[], issueId: string): DocumentIssue[] {
  return issues.map((issue) => (issue.id === issueId ? { ...issue, resolved: true } : issue));
}

export function withApplication(application: Application): Partial<SessionState> {
  return { application };
}
