import { describe, expect, it, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';

let app: Express;
const SESSION = 'test-session-happy-path';
const withSession = (id = SESSION) => ({ 'x-session-id': id });

beforeAll(() => {
  app = createApp();
});

describe('api validation', () => {
  it('reports health and which AI mode is active', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.prototype).toBe(true);
  });

  it('404s an unknown service with a readable message', async () => {
    const res = await request(app).get('/api/services/does-not-exist').expect(404);
    expect(res.body.error.message).toMatch(/prototype/i);
    expect(res.body.error.action).toBeDefined();
  });

  it('rejects a malformed body without leaking internals', async () => {
    const res = await request(app)
      .post('/api/digilocker/select')
      .set(withSession('validation'))
      .send({ documentIds: 'not-an-array' })
      .expect(400);
    expect(res.body.error.code).toBe('invalid_request');
    expect(JSON.stringify(res.body)).not.toMatch(/stack|ZodError/i);
  });

  it('rejects an empty AI question', async () => {
    await request(app)
      .post('/api/ai/explain')
      .set(withSession('validation'))
      .send({ serviceId: 'income-certificate', question: '' })
      .expect(400);
  });

  it('answers questions even with no API key configured', async () => {
    const res = await request(app)
      .post('/api/ai/explain')
      .set(withSession('validation'))
      .send({
        serviceId: 'income-certificate',
        context: 'document checklist',
        question: 'why do I need income proof?',
      })
      .expect(200);

    expect(res.body.answer.length).toBeGreaterThan(20);
    expect(res.body.disclaimer).toBeDefined();
    expect(['ai', 'fallback']).toContain(res.body.source);
  });
});

describe('the whole citizen journey', () => {
  it('runs from empty session to simulated submission', async () => {
    const services = await request(app).get('/api/services').expect(200);
    expect(services.body.find((s: { id: string }) => s.id === 'income-certificate').status).toBe(
      'available',
    );

    // Nothing prepared yet: the application must refuse to start.
    const blocked = await request(app)
      .post('/api/application/start')
      .set(withSession())
      .send({ serviceId: 'income-certificate' })
      .expect(400);
    expect(blocked.body.error.code).toBe('blocked');

    await request(app).post('/api/digilocker/connect').set(withSession()).expect(200);
    await request(app)
      .post('/api/digilocker/select')
      .set(withSession())
      .send({ documentIds: ['dl-aadhaar', 'dl-class-10'] })
      .expect(200);

    await request(app)
      .patch('/api/readiness/profile')
      .set(withSession())
      .send({
        fullName: 'Rahul Sharma',
        dateOfBirth: '1998-07-12',
        address: '12-3-456, Vidya Nagar, Khairatabad, Hyderabad, Telangana 500004',
        occupation: 'Salaried employee',
        annualIncome: '186000',
        purpose: 'Education scholarship application',
      })
      .expect(200);

    const afterLocker = await request(app)
      .get('/api/readiness/income-certificate')
      .set(withSession())
      .expect(200);
    expect(afterLocker.body.readiness.readyToApply).toBe(false);
    expect(
      afterLocker.body.readiness.missingRequirements.map((i: { requirementId: string }) => i.requirementId),
    ).toEqual(['income-proof', 'photograph']);

    // Upload income proof - the simulated reader finds a name written differently.
    const upload = await request(app)
      .post('/api/documents/upload')
      .set(withSession())
      .field('serviceId', 'income-certificate')
      .field('requirementId', 'income-proof')
      .attach('file', Buffer.from('synthetic salary slip'), {
        filename: 'salary-slip.pdf',
        contentType: 'application/pdf',
      })
      .expect(200);
    expect(upload.body.analysis.needsReview).toBe(true);
    expect(upload.body.analysis.detectedName).toBe('Rahul Kumar Sharma');

    const flagged = await request(app)
      .get('/api/readiness/income-certificate')
      .set(withSession())
      .expect(200);
    expect(flagged.body.readiness.blockingIssues).toHaveLength(1);

    const issueId = flagged.body.readiness.blockingIssues[0].id;
    await request(app)
      .post('/api/readiness/resolve-issue')
      .set(withSession())
      .send({ issueId })
      .expect(200);

    await request(app)
      .post('/api/documents/upload')
      .set(withSession())
      .field('serviceId', 'income-certificate')
      .field('requirementId', 'photograph')
      .attach('file', Buffer.from('synthetic photo'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    const ready = await request(app)
      .get('/api/readiness/income-certificate')
      .set(withSession())
      .expect(200);
    expect(ready.body.readiness.readyToApply).toBe(true);
    expect(ready.body.readiness.readinessPercentage).toBe(100);

    const started = await request(app)
      .post('/api/application/start')
      .set(withSession())
      .send({ serviceId: 'income-certificate' })
      .expect(200);
    const application = started.body.application;
    // Prepared answers arrive pre-filled - the payoff of preparing first.
    expect(application.values.fullName).toBe('Rahul Sharma');
    expect(application.values.annualIncome).toBe('186000');

    await request(app)
      .patch(`/api/application/${application.id}`)
      .set(withSession())
      .send({ values: { guardianName: 'Suresh Sharma', mobile: '9000000000', householdSize: '4' } })
      .expect(200);

    for (const requirementId of [
      'identity-proof',
      'address-proof',
      'age-proof',
      'income-proof',
      'photograph',
    ]) {
      await request(app)
        .patch(`/api/application/${application.id}`)
        .set(withSession())
        .send({ attachRequirementId: requirementId })
        .expect(200);
    }

    const submitted = await request(app)
      .post(`/api/application/${application.id}/submit`)
      .set(withSession())
      .expect(200);

    expect(submitted.body.application.status).toBe('submitted');
    expect(submitted.body.application.referenceId).toMatch(/^DEMO-IC-\d+$/);
    expect(submitted.body.documentsPrepared).toBe(5);
    expect(submitted.body.issuesRemaining).toBe(0);
    expect(submitted.body.notice).toMatch(/simulated/i);
  }, 20000);

  it('refuses to submit an application with fields still empty', async () => {
    const session = 'test-session-incomplete';
    await request(app)
      .patch('/api/readiness/profile')
      .set(withSession(session))
      .send({
        fullName: 'Rahul Sharma',
        dateOfBirth: '1998-07-12',
        address: '12-3-456, Vidya Nagar, Khairatabad, Hyderabad, Telangana 500004',
        occupation: 'Salaried employee',
        annualIncome: '186000',
        purpose: 'Other',
      })
      .expect(200);
    await request(app)
      .post('/api/digilocker/select')
      .set(withSession(session))
      .send({ documentIds: ['dl-aadhaar', 'dl-class-10'] })
      .expect(200);
    for (const requirementId of ['income-proof', 'photograph']) {
      await request(app)
        .post('/api/documents/upload')
        .set(withSession(session))
        .field('serviceId', 'income-certificate')
        .field('requirementId', requirementId)
        .attach('file', Buffer.from('synthetic'), {
          filename: 'f.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);
    }
    const readiness = await request(app)
      .get('/api/readiness/income-certificate')
      .set(withSession(session))
      .expect(200);
    for (const issue of readiness.body.readiness.blockingIssues) {
      await request(app)
        .post('/api/readiness/resolve-issue')
        .set(withSession(session))
        .send({ issueId: issue.id })
        .expect(200);
    }

    const started = await request(app)
      .post('/api/application/start')
      .set(withSession(session))
      .send({ serviceId: 'income-certificate' })
      .expect(200);

    // guardianName, mobile and householdSize were never filled in.
    const res = await request(app)
      .post(`/api/application/${started.body.application.id}/submit`)
      .set(withSession(session))
      .expect(400);
    expect(res.body.error.message).toMatch(/not complete/i);
  }, 20000);

  it('rejects an oversized or unsupported upload with advice', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set(withSession('upload-errors'))
      .field('serviceId', 'income-certificate')
      .field('requirementId', 'photograph')
      .attach('file', Buffer.from('not a real document'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
      .expect(400);
    expect(res.body.error.message).toMatch(/JPG|PNG|PDF/i);
    expect(res.body.error.action).toBeDefined();
  });
});

describe('extension-facing endpoint', () => {
  it('answers readiness for requirement labels scraped from a page', async () => {
    const res = await request(app)
      .post('/api/readiness/from-page')
      .set(withSession('extension'))
      .send({
        serviceId: 'income-certificate',
        detectedRequirements: [
          { label: 'Upload identity proof' },
          { label: 'Income proof' },
          { label: 'Caste certificate' },
        ],
      })
      .expect(200);

    expect(res.body.readiness.items.length).toBeGreaterThan(0);
    expect(res.body.matched).toHaveLength(3);
    expect(res.body.unmatched).toEqual(['Caste certificate']);
  });
});
