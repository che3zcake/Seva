import { describe, expect, it } from 'vitest';
import { buildRejectionAutopsy } from '../domain/rejectionAutopsy.js';
import { evaluateReadiness } from '../domain/readinessEngine.js';
import { detectIssues } from '../domain/issueDetector.js';
import { findService } from '../data/services.js';
import { doc, emptyProfile, profile } from './helpers.js';
import type { CitizenProfile, Document, ServiceDefinition } from '@seva/shared';

const service = findService('income-certificate') as ServiceDefinition;

function autopsyFor(documents: Document[], p: CitizenProfile = profile(), resolved: string[] = []) {
  const issues = detectIssues({ profile: p, documents, resolvedIssueIds: resolved });
  const readiness = evaluateReadiness({ service, documents, profile: p, issues });
  return { autopsy: buildRejectionAutopsy(service, readiness), readiness, issues };
}

const LOCKER = [doc('aadhaar', 'aadhaar'), doc('class10', 'school-certificate')];
const SLIP = doc('slip', 'salary-slip', { source: 'user-upload', forRequirementId: 'income-proof' });
const PHOTO = doc('photo', 'photograph', { source: 'user-upload', forRequirementId: 'photograph' });
const FLAGGED_SLIP = doc('slip', 'salary-slip', {
  source: 'user-upload',
  forRequirementId: 'income-proof',
  metadata: { holderName: 'Rahul Kumar Sharma' },
});

describe('the first configured stop', () => {
  it('is income proof once the locker documents and answers are in place', () => {
    const { autopsy } = autopsyFor(LOCKER);

    expect(autopsy.firstFailure?.requirementId).toBe('income-proof');
    expect(autopsy.firstFailure?.mockStepTitle).toBe('Enclosures');
    expect(autopsy.firstFailure?.simulatedMessage).toMatch(/no income document is attached/i);
    expect(autopsy.clear).toBe(false);
  });

  it('orders by the mock form, not by the order rules were written in', () => {
    const { autopsy } = autopsyFor([], emptyProfile());
    const orders = autopsy.findings.map((f) => f.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    // Personal details come before enclosures.
    expect(autopsy.firstFailure?.mockStepId).toBe('personal');
  });

  it('advances to the next stop once the current one is cleared', () => {
    const before = autopsyFor(LOCKER).autopsy;
    expect(before.firstFailure?.requirementId).toBe('income-proof');

    const after = autopsyFor([...LOCKER, SLIP]).autopsy;
    expect(after.firstFailure?.requirementId).toBe('photograph');
    expect(after.findings).toHaveLength(1);
  });
});

describe('an issue-specific stop beats the general one', () => {
  it('reports the name variant rather than the missing-document rule', () => {
    const { autopsy } = autopsyFor([...LOCKER, FLAGGED_SLIP]);
    const first = autopsy.firstFailure;

    expect(first?.requirementId).toBe('income-proof');
    expect(first?.ruleId).toBe('stop-income-proof-name');
    expect(first?.issueCode).toBe('name-variant');
    expect(first?.status).toBe('needs-review');
    expect(first?.simulatedMessage).toMatch(/held for verification/i);
    expect(first?.fixSteps.join(' ')).toMatch(/Rahul Kumar Sharma/);
  });

  it('falls back to the general rule when no issue is open', () => {
    const issues = detectIssues({ profile: profile(), documents: [...LOCKER, FLAGGED_SLIP], resolvedIssueIds: [] });
    const { autopsy } = autopsyFor([...LOCKER, FLAGGED_SLIP], profile(), issues.map((i) => i.id));
    // With the variant confirmed, income proof is settled and photograph is next.
    expect(autopsy.firstFailure?.requirementId).toBe('photograph');
  });
});

describe('the all-clear', () => {
  it('comes from readiness, never from an empty findings list', () => {
    const { autopsy, readiness } = autopsyFor([...LOCKER, SLIP, PHOTO]);
    expect(readiness.readyToApply).toBe(true);
    expect(autopsy.clear).toBe(true);
    expect(autopsy.firstFailure).toBeNull();
    expect(autopsy.findings).toHaveLength(0);
  });

  it('is withheld when a requirement is unsettled but has no configured rule', () => {
    // A service whose rules do not cover photograph: the journey is not clear,
    // and the preview must say so rather than invent a stop or go green.
    const partial: ServiceDefinition = {
      ...service,
      rejectionRules: (service.rejectionRules ?? []).filter((r) => r.requirementId !== 'photograph'),
    };
    const documents = [...LOCKER, SLIP];
    const issues = detectIssues({ profile: profile(), documents, resolvedIssueIds: [] });
    const readiness = evaluateReadiness({ service: partial, documents, profile: profile(), issues });
    const autopsy = buildRejectionAutopsy(partial, readiness);

    expect(autopsy.findings).toHaveLength(0);
    expect(autopsy.firstFailure).toBeNull();
    expect(autopsy.clear).toBe(false); // <- the important one
    expect(autopsy.unmappedRequirementIds).toEqual(['photograph']);
  });

  it('invents no message for an unmapped requirement', () => {
    const bare: ServiceDefinition = { ...service, rejectionRules: [] };
    const issues = detectIssues({ profile: emptyProfile(), documents: [], resolvedIssueIds: [] });
    const readiness = evaluateReadiness({ service: bare, documents: [], profile: emptyProfile(), issues });
    const autopsy = buildRejectionAutopsy(bare, readiness);

    expect(autopsy.findings).toHaveLength(0);
    expect(autopsy.unmappedRequirementIds.length).toBe(readiness.totalRequirements);
    expect(autopsy.clear).toBe(false);
  });
});

describe('every response carries its provenance', () => {
  it('marks itself simulated and names the ruleset', () => {
    const { autopsy } = autopsyFor(LOCKER);
    expect(autopsy.simulated).toBe(true);
    expect(autopsy.rulesetVersion).toBe(service.rulesetVersion);
    expect(autopsy.rulesetVersion).toMatch(/^synthetic-/);
    expect(autopsy.disclaimer).toMatch(/not a prediction/i);
  });

  it('never uses the language of a real government decision', () => {
    const { autopsy } = autopsyFor([...LOCKER, FLAGGED_SLIP]);
    const text = JSON.stringify(autopsy).toLowerCase();
    expect(text).not.toContain('will be rejected');
    expect(text).not.toContain('government will');
    expect(text).not.toContain('officer');
  });
});
