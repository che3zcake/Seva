import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { compareNames, detectIssues } from '../domain/issueDetector.js';
import { evaluateReadiness } from '../domain/readinessEngine.js';
import { checkSubmittable } from '../services/applicationService.js';
import { findService } from '../data/services.js';
import { createApp } from '../app.js';
import { doc, profile } from './helpers.js';
import type { Application, ReadinessResult, ServiceDefinition } from '@seva/shared';

const service = findService('income-certificate') as ServiceDefinition;

/**
 * Each test here pins a bug that shipped once. They are grouped by what went
 * wrong rather than by module, because that is how they will be read if one of
 * them ever fails again.
 */

describe('a confirmation belongs to one comparison, not one document', () => {
  const documents = [doc('pan', 'pan', { metadata: { holderName: 'Rahul Kumar Sharma' } })];

  it('does not carry a cleared flag over to a different name comparison', () => {
    const first = detectIssues({ profile: profile(), documents, resolvedIssueIds: [] });
    const confirmed = first.map((issue) => issue.id);
    expect(confirmed).toHaveLength(1);

    // The citizen now edits the name on their application.
    const afterEdit = detectIssues({
      profile: profile({ fullName: 'Priya Menon' }),
      documents,
      resolvedIssueIds: confirmed,
    });

    expect(afterEdit[0]?.resolved).toBe(false);
    expect(afterEdit[0]?.id).not.toBe(confirmed[0]);
  });

  it('still carries it over when the comparison is unchanged', () => {
    const first = detectIssues({ profile: profile(), documents, resolvedIssueIds: [] });
    const again = detectIssues({
      profile: profile(),
      documents,
      resolvedIssueIds: first.map((issue) => issue.id),
    });
    expect(again[0]?.resolved).toBe(true);
  });

  it('re-raises an address mismatch when the PIN code changes', () => {
    const withAddress = [
      doc('aadhaar', 'aadhaar', { metadata: { address: 'Indore, MP 452001' } }),
    ];
    const first = detectIssues({
      profile: profile({ address: 'New Delhi 110001' }),
      documents: withAddress,
      resolvedIssueIds: [],
    });
    const afterMove = detectIssues({
      profile: profile({ address: 'Bengaluru 560001' }),
      documents: withAddress,
      resolvedIssueIds: first.map((issue) => issue.id),
    });
    expect(afterMove[0]?.resolved).toBe(false);
  });
});

describe('an initial is not a different person', () => {
  it('treats an initial as the same name part', () => {
    expect(compareNames('Rahul Kumar Sharma', 'Rahul K Sharma')).toBe('variant');
    expect(compareNames('Rahul K Sharma', 'Rahul Kumar Sharma')).toBe('variant');
    expect(compareNames('R K Sharma', 'Rahul Kumar Sharma')).toBe('variant');
  });

  it('still rejects a genuinely different name', () => {
    expect(compareNames('Priya Menon', 'Rahul Sharma')).toBe('different');
  });

  it('does not strand the citizen with an unresolvable issue over an initial', () => {
    const issues = detectIssues({
      profile: profile({ fullName: 'Rahul K Sharma' }),
      documents: [doc('pan', 'pan', { metadata: { holderName: 'Rahul Kumar Sharma' } })],
      resolvedIssueIds: [],
    });
    expect(issues[0]?.code).toBe('name-variant');
    expect(issues[0]?.resolvable).toBe(true);
  });
});

describe('an unconfigured service is not a prepared one', () => {
  it('does not report readyToApply for a service with no requirements', () => {
    const empty = findService('passport') as ServiceDefinition;
    const result = evaluateReadiness({
      service: empty,
      documents: [],
      profile: profile(),
      issues: [],
    });
    expect(result.totalRequirements).toBe(0);
    expect(result.readyToApply).toBe(false);
  });

  it('refuses to start a coming-soon service over the API', async () => {
    const res = await request(createApp())
      .post('/api/application/start')
      .set({ 'x-session-id': 'coming-soon-check' })
      .send({ serviceId: 'passport' })
      .expect(400);
    expect(res.body.error.message).toMatch(/not part of this prototype yet/i);
    expect(res.body.error.action).toBeDefined();
  });
});

describe('an attachment stops counting when its document goes away', () => {
  function readinessWith(matched: Record<string, string | undefined>): ReadinessResult {
    return {
      serviceId: service.id,
      serviceName: service.name,
      totalRequirements: 0,
      satisfiedRequirements: 0,
      needsReview: 0,
      missingRequirements: [],
      readinessPercentage: 100,
      items: Object.entries(matched).map(([requirementId, matchedDocumentId]) => ({
        requirementId,
        title: requirementId,
        description: '',
        type: 'document' as const,
        category: 'identity' as const,
        status: 'ready' as const,
        reason: '',
        guidance: [],
        issueIds: [],
        matchedDocumentId,
      })),
      blockingIssues: [],
      recommendations: [],
      readyToApply: true,
      summary: '',
      documentsReady: 0,
      documentsTotal: 0,
      informationReady: 0,
      informationTotal: 0,
    };
  }

  const application: Application = {
    id: 'app-1',
    serviceId: service.id,
    serviceName: service.name,
    status: 'draft',
    currentStepIndex: 0,
    values: Object.fromEntries(
      service.applicationSteps.flatMap((step) => step.fields.map((f) => [f.id, 'filled'])),
    ),
    attachedDocuments: service.requirements
      .filter((r) => r.type === 'document')
      .map((r) => ({
        requirementId: r.id,
        requirementTitle: r.title,
        documentId: `doc-for-${r.id}`,
        documentName: r.title,
        source: 'digilocker' as const,
      })),
    createdAt: '2025-01-01T00:00:00.000Z',
  };

  const allMatched = Object.fromEntries(
    service.requirements.filter((r) => r.type === 'document').map((r) => [r.id, `doc-for-${r.id}`]),
  );

  it('accepts an application whose attachments still resolve', () => {
    const check = checkSubmittable(service, application, readinessWith(allMatched));
    expect(check.ok).toBe(true);
    expect(check.missingDocuments).toHaveLength(0);
  });

  it('reopens the step when an attached document was removed', () => {
    const check = checkSubmittable(
      service,
      application,
      readinessWith({ ...allMatched, 'income-proof': undefined }),
    );
    expect(check.ok).toBe(false);
    expect(check.missingDocuments).toContain('Income proof');
  });

  it('reopens the step when an attached document was swapped for another', () => {
    const check = checkSubmittable(
      service,
      application,
      readinessWith({ ...allMatched, 'address-proof': 'some-other-document' }),
    );
    expect(check.ok).toBe(false);
    expect(check.missingDocuments).toContain('Address proof');
  });
});

describe('an oversized upload is the citizen’s problem to fix, not a crash', () => {
  it('answers 400 with advice rather than 500', async () => {
    const res = await request(createApp())
      .post('/api/documents/upload')
      .set({ 'x-session-id': 'oversized' })
      .field('serviceId', 'income-certificate')
      .field('requirementId', 'photograph')
      .attach('file', Buffer.alloc(6 * 1024 * 1024, 1), {
        filename: 'huge.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);

    expect(res.body.error.message).toMatch(/larger than 5 MB/i);
    expect(res.body.error.action).toBeDefined();
    expect(JSON.stringify(res.body)).not.toMatch(/stack|MulterError/i);
  }, 20000);
});
