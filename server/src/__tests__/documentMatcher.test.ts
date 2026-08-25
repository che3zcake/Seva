import { describe, expect, it } from 'vitest';
import { bestMatch, canSatisfy, matchDocuments } from '../domain/documentMatcher.js';
import { findService } from '../data/services.js';
import { doc } from './helpers.js';
import type { DocumentRequirement, ServiceDefinition } from '@seva/shared';

const service = findService('income-certificate') as ServiceDefinition;
const addressProof = service.requirements.find(
  (r) => r.id === 'address-proof',
) as DocumentRequirement;

describe('document matching', () => {
  it('accepts a configured document type', () => {
    expect(canSatisfy(addressProof, doc('a', 'aadhaar'))).toBe(true);
    expect(canSatisfy(addressProof, doc('b', 'utility-bill'))).toBe(true);
  });

  it('rejects a document type this requirement does not list', () => {
    expect(canSatisfy(addressProof, doc('c', 'photograph'))).toBe(false);
  });

  it('rejects documents marked invalid', () => {
    expect(canSatisfy(addressProof, doc('d', 'aadhaar', { status: 'invalid' }))).toBe(false);
  });

  it('finds every candidate, not just the first', () => {
    const matches = matchDocuments(addressProof, [
      doc('a', 'aadhaar'),
      doc('b', 'utility-bill'),
      doc('c', 'photograph'),
    ]);
    expect(matches.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('prefers a clean document over a flagged one', () => {
    const flagged = doc('flagged', 'aadhaar');
    const clean = doc('clean', 'utility-bill');
    const picked = bestMatch(addressProof, [flagged, clean], (id) => id === 'flagged');
    expect(picked?.id).toBe('clean');
  });

  it('prefers a locker document over an upload when both are clean', () => {
    const locker = doc('locker', 'aadhaar');
    const uploaded = doc('uploaded', 'utility-bill', { source: 'user-upload' });
    const picked = bestMatch(addressProof, [uploaded, locker], () => false);
    expect(picked?.id).toBe('locker');
  });

  it('returns nothing when the citizen has no qualifying document', () => {
    expect(bestMatch(addressProof, [doc('p', 'photograph')], () => false)).toBeUndefined();
  });
});
