import { describe, expect, it } from 'vitest';
import { buildIssueFacts } from '../services/openaiService.js';
import { compareNames, detectIssues } from '../domain/issueDetector.js';
import { findService } from '../data/services.js';
import { doc, profile } from './helpers.js';
import type { ServiceDefinition } from '@taiyaar/shared';

const service = findService('income-certificate') as ServiceDefinition;

/**
 * These tests exist because "we do not send your name anywhere" is a claim, and
 * a claim nobody can check is a slogan. Each one fails if the guarantee breaks.
 */
describe('names do not leave the server', () => {
  const SENTINEL_CITIZEN = 'Zxqvomir Tellibrand';
  const SENTINEL_DOCUMENT = 'Zxqvomir Kestrelby Tellibrand';

  const issues = detectIssues({
    profile: profile({ fullName: SENTINEL_CITIZEN }),
    documents: [doc('pan', 'pan', { metadata: { holderName: SENTINEL_DOCUMENT } })],
    resolvedIssueIds: [],
  });

  it('puts the real names in the detail the citizen reads on their own screen', () => {
    // The deterministic copy is allowed - and required - to be specific.
    expect(issues[0]?.detail).toContain(SENTINEL_CITIZEN);
    expect(issues[0]?.detail).toContain(SENTINEL_DOCUMENT);
  });

  it('keeps both names out of everything sent to the model', () => {
    const issue = issues[0];
    expect(issue).toBeDefined();
    if (!issue) return;

    const facts = buildIssueFacts(service, issue);
    expect(facts).not.toContain(SENTINEL_CITIZEN);
    expect(facts).not.toContain(SENTINEL_DOCUMENT);
    expect(facts).not.toContain('Zxqvomir');
    expect(facts).not.toContain('Tellibrand');
    expect(facts).not.toContain('Kestrelby');
  });

  it('still tells the model enough to write a useful explanation', () => {
    const issue = issues[0];
    if (!issue) return;
    const facts = buildIssueFacts(service, issue);
    expect(facts).toContain(service.name);
    expect(facts.toLowerCase()).toContain('middle name');
    expect(facts.toLowerCase()).toContain('confirming');
  });

  it('describes every issue code without reference to a person', () => {
    for (const code of ['name-variant', 'name-mismatch', 'address-mismatch', 'unreadable'] as const) {
      const facts = buildIssueFacts(service, { ...issues[0]!, code });
      expect(facts).not.toContain(SENTINEL_CITIZEN);
      expect(facts.length).toBeGreaterThan(60);
    }
  });
});

describe('names that are not written in English', () => {
  it('compares two names in the same Indic script', () => {
    expect(compareNames('राहुल शर्मा', 'राहुल शर्मा')).toBe('exact');
    expect(compareNames('राहुल कुमार शर्मा', 'राहुल शर्मा')).toBe('variant');
    expect(compareNames('प्रिया मेनन', 'राहुल शर्मा')).toBe('different');
  });

  it('handles Tamil and Bengali too', () => {
    expect(compareNames('ராகுல் ஷர்மா', 'ராகுல் ஷர்மா')).toBe('exact');
    expect(compareNames('রাহুল কুমার শর্মা', 'রাহুল শর্মা')).toBe('variant');
  });

  it('raises a real issue for an Indic-script variant, instead of staying silent', () => {
    const issues = detectIssues({
      profile: profile({ fullName: 'राहुल शर्मा' }),
      documents: [doc('pan', 'pan', { metadata: { holderName: 'राहुल कुमार शर्मा' } })],
      resolvedIssueIds: [],
    });
    expect(issues[0]?.code).toBe('name-variant');
  });

  it('refuses to guess across scripts rather than accusing anyone', () => {
    // A Devanagari certificate against a form filled in English cannot be
    // compared by spelling. "different person" there would be a false
    // accusation with no way out, so the honest answer is "unknown".
    expect(compareNames('राहुल शर्मा', 'Rahul Sharma')).toBe('unknown');

    const issues = detectIssues({
      profile: profile({ fullName: 'Rahul Sharma' }),
      documents: [doc('pan', 'pan', { metadata: { holderName: 'राहुल शर्मा' } })],
      resolvedIssueIds: [],
    });
    expect(issues).toHaveLength(0);
  });
});
