import { z } from 'zod';

export const profilePatchSchema = z.object({
  fullName: z.string().max(120).optional(),
  dateOfBirth: z.string().max(40).optional(),
  address: z.string().max(400).optional(),
  occupation: z.string().max(120).optional(),
  annualIncome: z.string().max(40).optional(),
  purpose: z.string().max(200).optional(),
});

export const digiLockerSelectSchema = z.object({
  documentIds: z.array(z.string().min(1)).min(1).max(20),
});

export const readinessCheckSchema = z.object({
  serviceId: z.string().min(1),
  profile: profilePatchSchema.optional(),
});

export const fromPageSchema = z.object({
  serviceId: z.string().min(1).optional(),
  detectedRequirements: z
    .array(z.object({ label: z.string().min(1).max(200), hint: z.string().max(400).optional() }))
    .min(1)
    .max(40),
});

export const resolveIssueSchema = z.object({
  issueId: z.string().min(1),
});

export const aiExplainSchema = z.object({
  serviceId: z.string().min(1),
  context: z.string().max(200).default('general'),
  question: z.string().min(1).max(500),
  relevantRequirement: z.string().max(100).optional(),
});

export const applicationStartSchema = z.object({
  serviceId: z.string().min(1),
});

export const applicationPatchSchema = z.object({
  values: z.record(z.string(), z.string().max(1000)).optional(),
  currentStepIndex: z.number().int().min(0).max(20).optional(),
  attachRequirementId: z.string().min(1).optional(),
});

export const uploadFieldsSchema = z.object({
  serviceId: z.string().min(1),
  requirementId: z.string().min(1),
});
