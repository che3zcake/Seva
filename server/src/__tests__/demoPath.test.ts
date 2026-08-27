import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';

let app: Express;
const S = (id: string) => ({ 'x-session-id': id });

beforeAll(() => {
  app = createApp();
});

/**
 * The judge-facing path, asserted end to end.
 *
 * Every step here appears in the first minute of the submission video. If this
 * file goes red, the video is showing something the build cannot do.
 */
describe('the 60-second demo', () => {
  const session = 'demo-storyboard';

  it('seeds straight to the first configured stop: income proof, at enclosures', async () => {
    const res = await request(app).post('/api/demo/seed').set(S(session)).expect(200);

    expect(res.body.readiness.readyToApply).toBe(false);
    expect(res.body.autopsy.simulated).toBe(true);
    expect(res.body.autopsy.rulesetVersion).toMatch(/^synthetic-/);
    expect(res.body.autopsy.firstFailure.requirementId).toBe('income-proof');
    expect(res.body.autopsy.firstFailure.mockStepTitle).toBe('Enclosures');
    // Identity, address and date of birth are already covered by the locker.
    expect(res.body.readiness.documentsReady).toBe(3);
    expect(res.body.autopsy.unmappedRequirementIds).toEqual([]);
  });

  it('adds the built-in income document without a file picker, and flags the name', async () => {
    const res = await request(app)
      .post('/api/documents/sample')
      .set(S(session))
      .send({ serviceId: 'income-certificate', requirementId: 'income-proof' })
      .expect(200);

    expect(res.body.synthetic).toBe(true);
    expect(res.body.analysis.needsReview).toBe(true);
    expect(res.body.analysis.detectedName).toBe('Rahul Kumar Sharma');
  });

  it('moves the stop to the configured name-variant rule', async () => {
    const res = await request(app)
      .get('/api/readiness/income-certificate')
      .set(S(session))
      .expect(200);

    expect(res.body.autopsy.firstFailure.ruleId).toBe('stop-income-proof-name');
    expect(res.body.autopsy.firstFailure.issueCode).toBe('name-variant');
    expect(res.body.autopsy.firstFailure.simulatedMessage).toMatch(/held for verification/i);
  });

  it('advances to the photograph once the citizen confirms the name', async () => {
    const before = await request(app)
      .get('/api/readiness/income-certificate')
      .set(S(session))
      .expect(200);

    await request(app)
      .post('/api/readiness/resolve-issue')
      .set(S(session))
      .send({ issueId: before.body.readiness.blockingIssues[0].id })
      .expect(200);

    const after = await request(app)
      .get('/api/readiness/income-certificate')
      .set(S(session))
      .expect(200);

    expect(after.body.autopsy.firstFailure.requirementId).toBe('photograph');
    expect(after.body.autopsy.findings).toHaveLength(1);
  });

  it('reaches the all-clear after the built-in photograph', async () => {
    await request(app)
      .post('/api/documents/sample')
      .set(S(session))
      .send({ serviceId: 'income-certificate', requirementId: 'photograph' })
      .expect(200);

    const res = await request(app)
      .get('/api/readiness/income-certificate')
      .set(S(session))
      .expect(200);

    expect(res.body.autopsy.clear).toBe(true);
    expect(res.body.autopsy.firstFailure).toBeNull();
    expect(res.body.readiness.readyToApply).toBe(true);
  });

  it('continues into the prefilled mock application', async () => {
    const res = await request(app)
      .post('/api/application/start')
      .set(S(session))
      .send({ serviceId: 'income-certificate' })
      .expect(200);

    expect(res.body.application.values.fullName).toBe('Rahul Sharma');
    expect(res.body.application.values.address).toMatch(/Telangana/);
  });

  it('resets to an empty session in one call', async () => {
    const res = await request(app).post('/api/demo/reset').set(S(session)).expect(200);
    expect(res.body.documents).toHaveLength(0);
    expect(res.body.profile.fullName).toBe('');
    expect(res.body.application).toBeUndefined();
  });

  it('is repeatable: seeding twice lands in the same place', async () => {
    const a = await request(app).post('/api/demo/seed').set(S('repeat-a')).expect(200);
    const b = await request(app).post('/api/demo/seed').set(S('repeat-b')).expect(200);
    expect(a.body.autopsy.firstFailure.ruleId).toBe(b.body.autopsy.firstFailure.ruleId);
    expect(a.body.readiness.readinessPercentage).toBe(b.body.readiness.readinessPercentage);
  });
});

describe('the fictional portal check', () => {
  it('returns readiness and the autopsy from the same recomputation', async () => {
    const session = 'portal-consistency';
    await request(app).post('/api/demo/seed').set(S(session)).expect(200);

    const res = await request(app)
      .post('/api/readiness/from-page')
      .set(S(session))
      .send({
        serviceId: 'income-certificate',
        detectedRequirements: [{ label: 'Income proof' }, { label: 'Caste certificate' }],
      })
      .expect(200);

    expect(res.body.autopsy.firstFailure.requirementId).toBe('income-proof');
    // The autopsy must agree with the readiness in the same payload.
    const incomeItem = res.body.readiness.items.find(
      (i: { requirementId: string }) => i.requirementId === 'income-proof',
    );
    expect(incomeItem.status).toBe('missing');
    expect(res.body.unmatched).toEqual(['Caste certificate']);
  });
});
