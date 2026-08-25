import type { Document, DocumentRequirement } from '@taiyaar/shared';

/**
 * Decides which of the citizen's documents may be used for a requirement.
 *
 * "May be used" means: this prototype's configured demo rules allow it. It is
 * not a statement about what any real office would accept, and the UI copy is
 * written to keep that distinction visible.
 */
export function canSatisfy(requirement: DocumentRequirement, document: Document): boolean {
  if (document.status === 'invalid') return false;
  // A file uploaded against one requirement is not silently reused for another.
  if (document.forRequirementId && document.forRequirementId !== requirement.id) return false;
  return requirement.acceptableDocumentTypes.includes(document.type);
}

export function matchDocuments(
  requirement: DocumentRequirement,
  documents: readonly Document[],
): Document[] {
  return documents.filter((doc) => canSatisfy(requirement, doc));
}

/**
 * Picks the document to actually use when several qualify.
 * Order: clean documents first, then locker documents, then oldest.
 */
export function bestMatch(
  requirement: DocumentRequirement,
  documents: readonly Document[],
  documentHasIssue: (documentId: string) => boolean,
): Document | undefined {
  const candidates = matchDocuments(requirement, documents);
  if (candidates.length === 0) return undefined;

  const score = (doc: Document): number => {
    let value = 0;
    if (documentHasIssue(doc.id)) value += 100;
    if (doc.source !== 'digilocker') value += 10;
    return value;
  };

  return [...candidates].sort((a, b) => {
    const diff = score(a) - score(b);
    if (diff !== 0) return diff;
    return a.addedAt.localeCompare(b.addedAt);
  })[0];
}
