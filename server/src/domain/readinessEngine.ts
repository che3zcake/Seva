import type {
  CitizenProfile,
  Document,
  DocumentIssue,
  DocumentRequirement,
  ReadinessItem,
  ReadinessResult,
  ServiceDefinition,
} from '@taiyaar/shared';
import { bestMatch } from './documentMatcher.js';

export interface ReadinessInput {
  service: ServiceDefinition;
  documents: readonly Document[];
  profile: CitizenProfile;
  issues: readonly DocumentIssue[];
}

const SOURCE_LABEL: Record<Document['source'], string> = {
  digilocker: 'Found in your DigiLocker',
  'user-upload': 'You uploaded this',
  'mock-system': 'Added by the prototype',
};

/**
 * The one place that decides whether a citizen is ready to start a form.
 *
 * Pure: no Express, no database, no model calls. Everything it needs arrives
 * as arguments, which is why it is the part with real tests.
 */
export function evaluateReadiness(input: ReadinessInput): ReadinessResult {
  const { service, documents, profile, issues } = input;

  const openIssues = issues.filter((issue) => !issue.resolved);
  const issuesByDocument = new Map<string, DocumentIssue[]>();
  for (const issue of openIssues) {
    const list = issuesByDocument.get(issue.documentId) ?? [];
    list.push(issue);
    issuesByDocument.set(issue.documentId, list);
  }
  const documentHasIssue = (documentId: string): boolean => issuesByDocument.has(documentId);

  const items: ReadinessItem[] = [];
  const inUseDocumentIds = new Set<string>();

  for (const requirement of service.requirements) {
    if (requirement.type === 'document') {
      items.push(evaluateDocumentRequirement(requirement, documents, issuesByDocument, documentHasIssue, inUseDocumentIds));
    } else {
      const value = profile[requirement.field]?.trim() ?? '';
      items.push({
        requirementId: requirement.id,
        title: requirement.title,
        description: requirement.description,
        type: 'information',
        category: requirement.category,
        status: value ? 'ready' : 'missing',
        reason: value ? 'You have already answered this.' : 'You have not answered this yet.',
        guidance: value ? [] : requirement.resolutionGuidance,
        issueIds: [],
      });
    }
  }

  const ready = items.filter((i) => i.status === 'ready').length;
  const needsReview = items.filter((i) => i.status === 'needs-review').length;
  const missingRequirements = items.filter((i) => i.status === 'missing');

  const blockingIssues = openIssues.filter((issue) => inUseDocumentIds.has(issue.documentId));

  const documentItems = items.filter((i) => i.type === 'document');
  const informationItems = items.filter((i) => i.type === 'information');

  const readyToApply =
    missingRequirements.length === 0 && needsReview === 0 && blockingIssues.length === 0;

  return {
    serviceId: service.id,
    serviceName: service.name,
    totalRequirements: items.length,
    satisfiedRequirements: ready,
    needsReview,
    missingRequirements,
    readinessPercentage: items.length === 0 ? 0 : Math.round((ready / items.length) * 100),
    items,
    blockingIssues,
    recommendations: buildRecommendations(items, blockingIssues),
    readyToApply,
    summary: buildSummary(documentItems, informationItems, blockingIssues, readyToApply),
    documentsReady: documentItems.filter((i) => i.status === 'ready').length,
    documentsTotal: documentItems.length,
    informationReady: informationItems.filter((i) => i.status === 'ready').length,
    informationTotal: informationItems.length,
  };
}

function evaluateDocumentRequirement(
  requirement: DocumentRequirement,
  documents: readonly Document[],
  issuesByDocument: Map<string, DocumentIssue[]>,
  documentHasIssue: (documentId: string) => boolean,
  inUseDocumentIds: Set<string>,
): ReadinessItem {
  const match = bestMatch(requirement, documents, documentHasIssue);

  if (!match) {
    return {
      requirementId: requirement.id,
      title: requirement.title,
      description: requirement.description,
      type: 'document',
      category: requirement.category,
      status: 'missing',
      reason: "We could not find a document for this.",
      guidance: requirement.resolutionGuidance,
      issueIds: [],
    };
  }

  inUseDocumentIds.add(match.id);
  const docIssues = issuesByDocument.get(match.id) ?? [];
  const relevant = docIssues.filter(
    (issue) => !issue.requirementId || issue.requirementId === requirement.id,
  );

  const base = {
    requirementId: requirement.id,
    title: requirement.title,
    description: requirement.description,
    type: 'document' as const,
    category: requirement.category,
    source: match.source,
    matchedDocumentId: match.id,
    matchedDocumentName: match.name,
    issueIds: relevant.map((i) => i.id),
  };

  if (relevant.length > 0) {
    const first = relevant[0];
    return {
      ...base,
      status: 'needs-review',
      reason: first ? first.title : 'This document needs a look before you start.',
      guidance: ['Open this document and confirm the details, or use a different one.'],
    };
  }

  return {
    ...base,
    status: 'ready',
    reason: `${SOURCE_LABEL[match.source]}: ${match.name}.`,
    guidance: [],
  };
}

function buildRecommendations(items: ReadinessItem[], blockingIssues: DocumentIssue[]): string[] {
  const out: string[] = [];
  for (const issue of blockingIssues) {
    out.push(
      issue.resolvable
        ? `Confirm the details on your ${issue.documentName.toLowerCase()}.`
        : `Replace your ${issue.documentName.toLowerCase()} - it is in a different name.`,
    );
  }
  for (const item of items) {
    if (item.status !== 'missing') continue;
    out.push(
      item.type === 'document'
        ? `Get your ${item.title.toLowerCase()} ready and upload it.`
        : `Answer: ${item.title.toLowerCase()}.`,
    );
  }
  return out;
}

function buildSummary(
  documentItems: ReadinessItem[],
  informationItems: ReadinessItem[],
  blockingIssues: DocumentIssue[],
  readyToApply: boolean,
): string {
  const docsReady = documentItems.filter((i) => i.status === 'ready').length;
  const infoMissing = informationItems.filter((i) => i.status === 'missing').length;

  if (readyToApply) {
    return 'Everything is ready. You can start the application now.';
  }

  const parts: string[] = [`You have ${docsReady} of ${documentItems.length} documents ready.`];
  const missingDocs = documentItems.filter((i) => i.status === 'missing').length;
  if (missingDocs === 1) parts.push('One document is still missing.');
  if (missingDocs > 1) parts.push(`${missingDocs} documents are still missing.`);
  if (blockingIssues.length === 1) parts.push('One document needs a quick look.');
  if (blockingIssues.length > 1) parts.push(`${blockingIssues.length} documents need a quick look.`);
  if (infoMissing > 0) {
    parts.push(
      infoMissing === 1
        ? 'One question is still unanswered.'
        : `${infoMissing} questions are still unanswered.`,
    );
  }
  return parts.join(' ');
}
