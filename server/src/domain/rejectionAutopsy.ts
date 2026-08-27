import type {
  DocumentIssue,
  ReadinessItem,
  ReadinessResult,
  RejectionAutopsy,
  RejectionFinding,
  RejectionRule,
  ServiceDefinition,
} from '@seva/shared';

export const AUTOPSY_DISCLAIMER =
  'Simulated preview from this prototype’s synthetic checklist. It is not a prediction of what any government office would decide.';

/**
 * Projects current readiness onto the configured stops of the mock journey.
 *
 * Pure: no Express, no session, no model. Give it a service and a readiness
 * result and it tells you the first configured place this journey stops.
 *
 * It never invents a stop. A requirement that is unsettled but carries no
 * configured rule is reported in `unmappedRequirementIds` so the interface can
 * say the preview is unavailable, which is the truth.
 */
export function buildRejectionAutopsy(
  service: ServiceDefinition,
  readiness: ReadinessResult,
): RejectionAutopsy {
  const rules = service.rejectionRules ?? [];
  const issuesById = new Map(readiness.blockingIssues.map((issue) => [issue.id, issue]));

  const findings: RejectionFinding[] = [];
  const unmapped: string[] = [];

  // Only requirements that are actually unsettled can stop the journey.
  const unsettled = readiness.items.filter(
    (item) => item.status === 'missing' || item.status === 'needs-review',
  );

  for (const item of unsettled) {
    const match = selectRule(rules, item, issuesById);
    if (!match) {
      unmapped.push(item.requirementId);
      continue;
    }
    findings.push(toFinding(match.rule, item, match.issue));
  }

  findings.sort((a, b) => a.order - b.order || a.requirementId.localeCompare(b.requirementId));

  return {
    simulated: true,
    rulesetVersion: service.rulesetVersion,
    firstFailure: findings[0] ?? null,
    findings,
    // Readiness owns this verdict. An empty findings list can also mean the
    // rules are incomplete, which is not the same as being ready.
    clear: readiness.readyToApply,
    unmappedRequirementIds: unmapped,
    disclaimer: AUTOPSY_DISCLAIMER,
  };
}

/**
 * The most specific rule that applies.
 *
 * A rule naming an issue code only fires when the requirement actually carries
 * that unresolved issue, and beats a general rule for the same requirement.
 */
function selectRule(
  rules: readonly RejectionRule[],
  item: ReadinessItem,
  issuesById: ReadonlyMap<string, DocumentIssue>,
): { rule: RejectionRule; issue?: DocumentIssue } | undefined {
  const openIssues = item.issueIds
    .map((id) => issuesById.get(id))
    .filter((issue): issue is DocumentIssue => Boolean(issue) && !issue!.resolved);

  const candidates = rules.filter((rule) => rule.requirementId === item.requirementId);

  for (const rule of candidates) {
    if (!rule.issueCode) continue;
    const issue = openIssues.find((candidate) => candidate.code === rule.issueCode);
    if (issue) return { rule, issue };
  }

  // Attach the open issue even when no rule named its code. Without this the
  // finding carries no issueId, the interface offers "add a document" for a
  // requirement that already has one, and the stop can never be cleared.
  const general = candidates.find((rule) => !rule.issueCode);
  return general ? { rule: general, issue: openIssues[0] } : undefined;
}

function toFinding(
  rule: RejectionRule,
  item: ReadinessItem,
  issue?: DocumentIssue,
): RejectionFinding {
  const flagged = item.status === 'needs-review';

  return {
    ruleId: rule.id,
    requirementId: rule.requirementId,
    requirementTitle: item.title,
    mockStepId: rule.mockStepId,
    mockStepTitle: rule.mockStepTitle,
    order: rule.order,
    status: flagged ? 'needs-review' : 'missing',
    // A rule naming an issue code only ever fires for a flagged document, so
    // its message is already the right one. The GENERAL rules are worded for a
    // missing document, and using that wording for a document that is present
    // but flagged would contradict the readiness result beside it.
    simulatedMessage: flagged
      ? (rule.reviewMessage ??
        (rule.issueCode
          ? rule.simulatedMessage
          : `Your ${item.title.toLowerCase()} is attached, but it does not match the application yet. In this simulation it is held at this step until that is settled.`))
      : rule.simulatedMessage,
    reason: issue ? issue.detail : item.reason,
    fixSteps: issue
      ? [issue.resolutionPrompt ?? 'Confirm this document, or use a different one.']
      : item.guidance,
    ...(issue
      ? { issueCode: issue.code, issueId: issue.id, issueResolvable: issue.resolvable }
      : {}),
  };
}
