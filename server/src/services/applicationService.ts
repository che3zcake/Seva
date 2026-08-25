import type {
  Application,
  AttachedDocument,
  CitizenProfile,
  ReadinessResult,
  ServiceDefinition,
} from '@seva/shared';

export class ApplicationBlocked extends Error {
  constructor(
    message: string,
    readonly action: string,
  ) {
    super(message);
    this.name = 'ApplicationBlocked';
  }
}

let sequence = 0;

function referenceId(service: ServiceDefinition): string {
  const initials = service.name
    .split(/\s+/)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 3);
  sequence += 1;
  return `DEMO-${initials}-${48290 + sequence}`;
}

/**
 * Refuses to start while anything is unresolved.
 *
 * The client hides the button too, but the check lives here as well - the
 * whole point of the product is that you cannot walk into the form early.
 */
export function startApplication(
  service: ServiceDefinition,
  profile: CitizenProfile,
  readiness: ReadinessResult,
): Application {
  if (!readiness.readyToApply) {
    throw new ApplicationBlocked(
      'There are still items to sort out before this application can start.',
      'Go back to your checklist and clear the remaining items.',
    );
  }

  const values: Record<string, string> = {};
  for (const step of service.applicationSteps) {
    for (const field of step.fields) {
      if (field.prefillFrom) values[field.id] = profile[field.prefillFrom] ?? '';
    }
  }

  return {
    id: `app-${Date.now().toString(36)}-${(sequence + 1).toString(36)}`,
    serviceId: service.id,
    serviceName: service.name,
    status: 'draft',
    currentStepIndex: 0,
    values,
    attachedDocuments: [],
    createdAt: new Date().toISOString(),
  };
}

export interface SubmitCheck {
  ok: boolean;
  missingFields: string[];
  missingDocuments: string[];
}

export function checkSubmittable(
  service: ServiceDefinition,
  application: Application,
  readiness: ReadinessResult,
): SubmitCheck {
  const missingFields: string[] = [];
  for (const step of service.applicationSteps) {
    for (const field of step.fields) {
      if (!field.required) continue;
      if (!application.values[field.id]?.trim()) missingFields.push(field.label);
    }
  }

  // An attachment only counts while it still points at the document readiness
  // currently resolves for that requirement. Deleting or replacing a document
  // after attaching it must re-open the step, not submit a stale name.
  const liveDocumentFor = new Map(
    readiness.items.map((item) => [item.requirementId, item.matchedDocumentId]),
  );
  const attached = new Set(
    application.attachedDocuments
      .filter((d) => liveDocumentFor.get(d.requirementId) === d.documentId)
      .map((d) => d.requirementId),
  );
  const missingDocuments = service.requirements
    .filter((r) => r.type === 'document' && r.required && !attached.has(r.id))
    .map((r) => r.title);

  return {
    ok: missingFields.length === 0 && missingDocuments.length === 0 && readiness.readyToApply,
    missingFields,
    missingDocuments,
  };
}

export function submitApplication(
  service: ServiceDefinition,
  application: Application,
  readiness: ReadinessResult,
): Application {
  const check = checkSubmittable(service, application, readiness);
  if (!check.ok) {
    const parts: string[] = [];
    if (check.missingFields.length > 0) parts.push(`missing: ${check.missingFields.join(', ')}`);
    if (check.missingDocuments.length > 0) {
      parts.push(`documents not attached: ${check.missingDocuments.join(', ')}`);
    }
    throw new ApplicationBlocked(
      `This application is not complete yet (${parts.join('; ') || 'readiness changed'}).`,
      'Go back through the steps and fill in what is highlighted.',
    );
  }

  return {
    ...application,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    referenceId: referenceId(service),
  };
}

export function attachDocument(
  application: Application,
  attachment: AttachedDocument,
): Application {
  const others = application.attachedDocuments.filter(
    (d) => d.requirementId !== attachment.requirementId,
  );
  return { ...application, attachedDocuments: [...others, attachment] };
}
