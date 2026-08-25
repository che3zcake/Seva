import type { CitizenProfile, Document, DocumentIssue } from '@taiyaar/shared';

export type NameComparison = 'exact' | 'variant' | 'different' | 'unknown';

function tokenize(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Compares a name on a document with the name entered for the application.
 *
 * 'variant'   - same person, written differently ("Rahul Sharma" vs
 *               "Rahul Kumar Sharma", or the parts reordered).
 * 'different' - the names do not overlap enough to be the same person.
 */
export function compareNames(a: string, b: string): NameComparison {
  const left = tokenize(a);
  const right = tokenize(b);
  if (left.length === 0 || right.length === 0) return 'unknown';
  if (left.join(' ') === right.join(' ')) return 'exact';

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const shorter = left.length <= right.length ? leftSet : rightSet;
  const longer = left.length <= right.length ? rightSet : leftSet;

  let contained = 0;
  for (const token of shorter) if (longer.has(token)) contained += 1;

  // Every part of the shorter name appears in the longer one: extra middle
  // name, reordered parts, or a dropped surname.
  if (contained === shorter.size) return 'variant';
  return 'different';
}

function pinCode(address: string): string | undefined {
  const match = address.match(/\b(\d{6})\b/);
  return match?.[1];
}

/**
 * Address comparison is deliberately narrow: it only fires when both sides
 * carry a PIN code and the codes disagree. Anything looser produces noise on
 * hand-typed addresses, and a false alarm here costs the citizen real time.
 */
export function compareAddresses(a: string, b: string): 'match' | 'different' | 'unknown' {
  const left = pinCode(a);
  const right = pinCode(b);
  if (!left || !right) return 'unknown';
  return left === right ? 'match' : 'different';
}

export interface DetectIssuesInput {
  profile: CitizenProfile;
  documents: readonly Document[];
  /** Ids the citizen has already confirmed. */
  resolvedIssueIds: readonly string[];
}

/**
 * Deterministic. The AI layer may re-word these, never add to them.
 */
export function detectIssues(input: DetectIssuesInput): DocumentIssue[] {
  const { profile, documents, resolvedIssueIds } = input;
  const issues: DocumentIssue[] = [];
  const resolved = new Set(resolvedIssueIds);

  for (const doc of documents) {
    const holderName = doc.metadata.holderName;
    if (holderName && profile.fullName.trim()) {
      const comparison = compareNames(holderName, profile.fullName);
      if (comparison === 'variant') {
        const id = `issue-name-${doc.id}`;
        issues.push({
          id,
          code: 'name-variant',
          documentId: doc.id,
          documentName: doc.name,
          requirementId: doc.forRequirementId,
          title: 'The name is written differently here',
          detail: `This document says "${holderName}". You entered "${profile.fullName}" for the application. These are usually the same person with a middle name written differently - but an office can send the application back over it, so it is worth confirming now rather than after you submit.`,
          severity: 'review',
          resolvable: true,
          resolved: resolved.has(id),
          resolutionPrompt: `Is "${holderName}" you?`,
        });
      } else if (comparison === 'different') {
        const id = `issue-name-${doc.id}`;
        issues.push({
          id,
          code: 'name-mismatch',
          documentId: doc.id,
          documentName: doc.name,
          requirementId: doc.forRequirementId,
          title: 'This document is in a different name',
          detail: `This document says "${holderName}", which does not look like "${profile.fullName}". A document in someone else's name cannot be used for your application.`,
          severity: 'blocking',
          resolvable: false,
          resolved: false,
        });
      }
    }

    const docAddress = doc.metadata.address;
    if (docAddress && profile.address.trim()) {
      if (compareAddresses(docAddress, profile.address) === 'different') {
        const id = `issue-address-${doc.id}`;
        issues.push({
          id,
          code: 'address-mismatch',
          documentId: doc.id,
          documentName: doc.name,
          requirementId: doc.forRequirementId,
          title: 'The address here is in a different area',
          detail: `The PIN code on this document does not match the address you entered. Which office handles your application depends on your address, so this is worth checking before you start.`,
          severity: 'review',
          resolvable: true,
          resolved: resolved.has(id),
          resolutionPrompt: 'Is the address you entered the correct current one?',
        });
      }
    }
  }

  return issues;
}
