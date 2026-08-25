import { describe, expect, it } from 'vitest';
import { evaluateReadiness } from '../domain/readinessEngine.js';
import { detectIssues } from '../domain/issueDetector.js';
import { findService } from '../data/services.js';
import { doc, emptyProfile, profile } from './helpers.js';
import type { ServiceDefinition } from '@taiyaar/shared';

const service = findService('income-certificate') as ServiceDefinition;

function run(documents: ReturnType<typeof doc>[], p = profile(), resolvedIssueIds: string[] = []) {
  const issues = detectIssues({ profile: p, documents, resolvedIssueIds });
  return evaluateReadiness({ service, documents, profile: p, issues });
}

describe('readiness engine', () => {
  it('reports everything missing for a citizen who has done nothing yet', () => {
    const result = run([], emptyProfile());
    expect(result.readyToApply).toBe(false);
    expect(result.satisfiedRequirements).toBe(0);
    expect(result.readinessPercentage).toBe(0);
    expect(result.missingRequirements).toHaveLength(result.totalRequirements);
  });

  it('is not ready when income proof and photograph are both absent', () => {
    const result = run([
      doc('aadhaar', 'aadhaar'),
      doc('class10', 'school-certificate'),
    ]);

    expect(result.readyToApply).toBe(false);
    const missingDocs = result.missingRequirements.filter((i) => i.type === 'document');
    expect(missingDocs.map((i) => i.requirementId).sort()).toEqual(['income-proof', 'photograph']);
  });

  it('marks identity and address ready from a single Aadhaar', () => {
    const result = run([doc('aadhaar', 'aadhaar')]);
    const byId = new Map(result.items.map((i) => [i.requirementId, i]));

    expect(byId.get('identity-proof')?.status).toBe('ready');
    expect(byId.get('address-proof')?.status).toBe('ready');
    expect(byId.get('identity-proof')?.reason).toContain('DigiLocker');
  });

  it('does not reuse a document uploaded for one requirement on another', () => {
    const salarySlip = doc('slip', 'salary-slip', {
      source: 'user-upload',
      forRequirementId: 'income-proof',
    });
    const result = run([salarySlip]);
    const byId = new Map(result.items.map((i) => [i.requirementId, i]));

    expect(byId.get('income-proof')?.status).toBe('ready');
    expect(byId.get('identity-proof')?.status).toBe('missing');
  });

  it('flags a name variant as needs-review rather than ready', () => {
    const slip = doc('slip', 'salary-slip', {
      source: 'user-upload',
      forRequirementId: 'income-proof',
      metadata: { holderName: 'Rahul Kumar Sharma' },
    });
    const result = run([slip]);
    const item = result.items.find((i) => i.requirementId === 'income-proof');

    expect(item?.status).toBe('needs-review');
    expect(result.blockingIssues).toHaveLength(1);
    expect(result.readyToApply).toBe(false);
  });

  it('clears the flag once the citizen confirms it', () => {
    const slip = doc('slip', 'salary-slip', {
      source: 'user-upload',
      forRequirementId: 'income-proof',
      metadata: { holderName: 'Rahul Kumar Sharma' },
    });
    const raised = detectIssues({ profile: profile(), documents: [slip], resolvedIssueIds: [] });
    const result = run([slip], profile(), raised.map((issue) => issue.id));
    const item = result.items.find((i) => i.requirementId === 'income-proof');

    expect(item?.status).toBe('ready');
    expect(result.blockingIssues).toHaveLength(0);
  });

  it('reaches ready to apply with every document and answer in place', () => {
    const result = run([
      doc('aadhaar', 'aadhaar'),
      doc('class10', 'school-certificate'),
      doc('slip', 'salary-slip', { source: 'user-upload', forRequirementId: 'income-proof' }),
      doc('photo', 'photograph', { source: 'user-upload', forRequirementId: 'photograph' }),
    ]);

    expect(result.readyToApply).toBe(true);
    expect(result.readinessPercentage).toBe(100);
    expect(result.missingRequirements).toHaveLength(0);
    expect(result.summary).toContain('ready');
  });

  it('stays blocked when a question is unanswered even with every document', () => {
    const result = run(
      [
        doc('aadhaar', 'aadhaar'),
        doc('class10', 'school-certificate'),
        doc('slip', 'salary-slip', { source: 'user-upload', forRequirementId: 'income-proof' }),
        doc('photo', 'photograph', { source: 'user-upload', forRequirementId: 'photograph' }),
      ],
      profile({ purpose: '' }),
    );

    expect(result.readyToApply).toBe(false);
    expect(result.missingRequirements.map((i) => i.requirementId)).toEqual(['info-purpose']);
    expect(result.documentsReady).toBe(result.documentsTotal);
  });

  it('explains, not just scores', () => {
    const result = run([doc('aadhaar', 'aadhaar')]);
    for (const item of result.items) {
      expect(item.reason.length).toBeGreaterThan(0);
      if (item.status !== 'ready') expect(item.guidance.length).toBeGreaterThan(0);
    }
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});
