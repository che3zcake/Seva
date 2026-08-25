import type { ReadinessResult, ServiceDefinition, SessionState } from '@taiyaar/shared';
import { detectIssues } from './issueDetector.js';
import { evaluateReadiness } from './readinessEngine.js';
import { sessionRepository } from '../repositories/sessionRepository.js';

/**
 * Recomputes issues and readiness from scratch on every read.
 *
 * Cheap, and it means the answer can never drift from the documents actually
 * in the session. The only thing carried forward is which issues the citizen
 * already confirmed.
 */
export function readinessFor(
  session: SessionState,
  service: ServiceDefinition,
): { readiness: ReadinessResult; session: SessionState } {
  const resolvedIssueIds = session.issues.filter((issue) => issue.resolved).map((issue) => issue.id);

  const issues = detectIssues({
    profile: session.profile,
    documents: session.documents,
    resolvedIssueIds,
  });

  const readiness = evaluateReadiness({
    service,
    documents: session.documents,
    profile: session.profile,
    issues,
  });

  return { readiness, session: sessionRepository.update(session.id, { issues }) };
}
