import type { CitizenProfile, Document, DocumentIssue } from '@taiyaar/shared';

export type NameComparison = 'exact' | 'variant' | 'different' | 'unknown';

/**
 * Unicode-aware on purpose. The previous version stripped everything outside
 * a-z, so a name in Devanagari, Tamil or Bengali produced no tokens at all and
 * every comparison came back "unknown" - a silent all-clear for a large share
 * of the people this is built for.
 */
function tokenize(name: string): string[] {
  return name
    .normalize('NFKC')
    .toLowerCase()
    // \p{M} matters: Devanagari and other Indic vowel signs are combining
    // marks, not letters. Without it "राहुल" shatters into fragments.
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function hasNonLatinLetters(name: string): boolean {
  for (const character of name) {
    if (/\p{L}/u.test(character) && !/\p{Script=Latin}/u.test(character)) return true;
  }
  return false;
}

/** Short, stable fragment of a value, for building comparison-specific ids. */
function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

/**
 * Two name parts refer to the same thing when they are equal, or when one is an
 * initial for the other. "Rahul K Sharma" and "Rahul Kumar Sharma" are the same
 * person, and telling someone otherwise strands them with no way forward.
 */
function tokenMatches(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length === 1 && b.startsWith(a)) return true;
  if (b.length === 1 && a.startsWith(b)) return true;
  return false;
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

  // A certificate printed in Devanagari against a form filled in English cannot
  // be compared by spelling. Calling that "a different person" would accuse
  // someone over a transliteration and leave them no way forward, so we say we
  // do not know - which is what we actually mean.
  if (hasNonLatinLetters(a) !== hasNonLatinLetters(b)) return 'unknown';

  if (left.join(' ') === right.join(' ')) return 'exact';

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const shorter = left.length <= right.length ? leftSet : rightSet;
  const longer = left.length <= right.length ? rightSet : leftSet;

  let contained = 0;
  for (const token of shorter) {
    if ([...longer].some((candidate) => tokenMatches(token, candidate))) contained += 1;
  }

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
        // The id encodes *what* was compared. Without that, a confirmation given
        // for one pair of names is silently reapplied after the citizen edits
        // their profile, and a mismatch they never saw shows up already cleared.
        const id = `issue-name-${doc.id}-${slug(holderName)}-${slug(profile.fullName)}`;
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
        const id = `issue-name-${doc.id}-${slug(holderName)}-${slug(profile.fullName)}`;
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
        const id = `issue-address-${doc.id}-${pinCode(docAddress) ?? 'x'}-${pinCode(profile.address) ?? 'x'}`;
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
