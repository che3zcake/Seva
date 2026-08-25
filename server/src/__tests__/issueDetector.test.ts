import { describe, expect, it } from 'vitest';
import { compareAddresses, compareNames, detectIssues } from '../domain/issueDetector.js';
import { simulateExtractedName } from '../services/documentAnalysis.js';
import { doc, profile } from './helpers.js';

describe('name comparison', () => {
  it('treats identical names as exact', () => {
    expect(compareNames('Rahul Sharma', 'rahul  sharma')).toBe('exact');
  });

  it('treats an extra middle name as a variant', () => {
    expect(compareNames('Rahul Kumar Sharma', 'Rahul Sharma')).toBe('variant');
    expect(compareNames('Rahul Sharma', 'Rahul Kumar Sharma')).toBe('variant');
  });

  it('treats reordered parts as a variant', () => {
    expect(compareNames('Sharma Rahul', 'Rahul Sharma')).toBe('variant');
  });

  it('treats a genuinely different name as different', () => {
    expect(compareNames('Priya Menon', 'Rahul Sharma')).toBe('different');
  });

  it('says nothing when a name is blank', () => {
    expect(compareNames('', 'Rahul Sharma')).toBe('unknown');
  });
});

describe('address comparison', () => {
  it('matches on PIN code', () => {
    expect(compareAddresses('12 Some Road, Indore 452001', 'Indore, MP 452001')).toBe('match');
  });

  it('flags different PIN codes', () => {
    expect(compareAddresses('Indore 452001', 'Bhopal 462001')).toBe('different');
  });

  it('stays quiet when there is no PIN code to compare', () => {
    expect(compareAddresses('Indore', 'Bhopal')).toBe('unknown');
  });
});

describe('issue detection', () => {
  it('raises a resolvable review issue for a name variant', () => {
    const issues = detectIssues({
      profile: profile(),
      documents: [doc('pan', 'pan', { metadata: { holderName: 'Rahul Kumar Sharma' } })],
      resolvedIssueIds: [],
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe('name-variant');
    expect(issues[0]?.severity).toBe('review');
    expect(issues[0]?.resolvable).toBe(true);
    expect(issues[0]?.detail).toContain('Rahul Kumar Sharma');
  });

  it('raises an unresolvable blocking issue for a different name', () => {
    const issues = detectIssues({
      profile: profile(),
      documents: [doc('pan', 'pan', { metadata: { holderName: 'Priya Menon' } })],
      resolvedIssueIds: [],
    });

    expect(issues[0]?.code).toBe('name-mismatch');
    expect(issues[0]?.severity).toBe('blocking');
    expect(issues[0]?.resolvable).toBe(false);
  });

  it('carries the resolved flag through a recompute', () => {
    const documents = [doc('pan', 'pan', { metadata: { holderName: 'Rahul Kumar Sharma' } })];
    const first = detectIssues({ profile: profile(), documents, resolvedIssueIds: [] });
    const again = detectIssues({
      profile: profile(),
      documents,
      resolvedIssueIds: first.map((i) => i.id),
    });
    expect(again[0]?.resolved).toBe(true);
  });

  it('raises nothing when the name matches exactly', () => {
    const issues = detectIssues({
      profile: profile(),
      documents: [doc('aadhaar', 'aadhaar', { metadata: { holderName: 'Rahul Sharma' } })],
      resolvedIssueIds: [],
    });
    expect(issues).toHaveLength(0);
  });

  it('raises nothing before the citizen has entered their name', () => {
    const issues = detectIssues({
      profile: profile({ fullName: '' }),
      documents: [doc('pan', 'pan', { metadata: { holderName: 'Rahul Kumar Sharma' } })],
      resolvedIssueIds: [],
    });
    expect(issues).toHaveLength(0);
  });
});

describe('simulated document reading', () => {
  it('always produces a variant of the name the citizen entered', () => {
    for (const name of ['Rahul Sharma', 'Rahul Kumar Sharma', 'Priya Anne Menon']) {
      const extracted = simulateExtractedName(name);
      expect(extracted).toBeDefined();
      expect(compareNames(extracted as string, name)).toBe('variant');
    }
  });

  it('produces nothing for a single-word name', () => {
    expect(simulateExtractedName('Rahul')).toBeUndefined();
  });
});
