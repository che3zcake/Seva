import type {
  Document,
  DocumentAnalysis,
  DocumentAnalysisCheck,
  DocumentRequirement,
  DocumentType,
} from '@seva/shared';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export class UploadRejected extends Error {
  constructor(
    message: string,
    readonly action: string,
  ) {
    super(message);
    this.name = 'UploadRejected';
  }
}

/**
 * Stands in for reading the uploaded file.
 *
 * Nothing is parsed and nothing is stored - the file buffer is discarded as
 * soon as this returns. The "extracted" name is derived from what the citizen
 * already typed, so the mismatch demo works for any name rather than only for
 * the fixture citizen.
 */
export function simulateExtractedName(profileName: string): string | undefined {
  const tokens = profileName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return undefined;
  if (tokens.length >= 3) {
    const first = tokens[0];
    const last = tokens[tokens.length - 1];
    return first && last ? `${first} ${last}` : undefined;
  }
  const [first, second] = tokens;
  if (!first || !second) return undefined;
  return `${first} Kumar ${second}`;
}

/** Categories where a name would realistically appear on the document. */
const NAME_BEARING: ReadonlySet<DocumentRequirement['category']> = new Set([
  'identity',
  'address',
  'income',
  'age',
]);

/**
 * A built-in stand-in file for each kind of requirement.
 *
 * The demo path must not depend on a judge having a suitable file to hand, or
 * on an operating-system file picker working inside a screen recording. These
 * go through exactly the same analysis as a real upload, so the fix flow a
 * judge sees is the fix flow a citizen would get.
 */
const SAMPLE_FILES: Record<string, { fileName: string; mimeType: string; sizeBytes: number }> = {
  income: { fileName: 'salary-slip-june-2026.pdf', mimeType: 'application/pdf', sizeBytes: 184_320 },
  photo: { fileName: 'passport-photo.jpg', mimeType: 'image/jpeg', sizeBytes: 92_160 },
  identity: { fileName: 'identity-card.jpg', mimeType: 'image/jpeg', sizeBytes: 145_408 },
  address: { fileName: 'electricity-bill-june-2026.pdf', mimeType: 'application/pdf', sizeBytes: 121_856 },
  age: { fileName: 'class-10-certificate.pdf', mimeType: 'application/pdf', sizeBytes: 210_944 },
};

export function sampleFileFor(requirement: DocumentRequirement): {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
} {
  return (
    SAMPLE_FILES[requirement.category] ?? {
      fileName: `${requirement.id}-sample.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 150_000,
    }
  );
}

export interface AnalyseUploadInput {
  requirement: DocumentRequirement;
  profileName: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AnalyseUploadResult {
  document: Document;
  analysis: DocumentAnalysis;
}

export function analyseUpload(input: AnalyseUploadInput): AnalyseUploadResult {
  const { requirement, profileName, fileName, mimeType, sizeBytes } = input;

  if (sizeBytes > MAX_UPLOAD_BYTES) {
    throw new UploadRejected(
      'That file is larger than 5 MB.',
      'Try a smaller photo, or save the PDF at a lower quality.',
    );
  }
  if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw new UploadRejected(
      'We can only read JPG, PNG, WebP and PDF files.',
      'Take a photo of the document, or export it as a PDF.',
    );
  }

  const detectedType: DocumentType = requirement.acceptableDocumentTypes[0] ?? 'other';
  const detectedName = NAME_BEARING.has(requirement.category)
    ? simulateExtractedName(profileName)
    : undefined;

  const checks: DocumentAnalysisCheck[] = [
    {
      label: 'File readable',
      status: 'pass',
      detail: `${formatSize(sizeBytes)} ${mimeType === 'application/pdf' ? 'PDF' : 'image'}.`,
    },
    {
      label: 'Document category identified',
      status: 'pass',
      detail: `Filed under ${requirement.title.toLowerCase()}.`,
    },
  ];

  if (detectedName) {
    checks.push({
      label: 'Name detected',
      status: 'pass',
      detail: `Read as "${detectedName}".`,
    });
    checks.push({
      label: 'Information needs review',
      status: 'warning',
      detail: 'The name here is written differently from the one on your application.',
    });
  } else {
    checks.push({
      label: 'No text to check',
      status: 'pass',
      detail: 'Nothing on this document needs to be matched against your details.',
    });
  }

  const document: Document = {
    id: `upload-${requirement.id}-${Date.now().toString(36)}`,
    name: friendlyName(requirement, fileName),
    type: detectedType,
    issuer: 'Uploaded by you',
    source: 'user-upload',
    status: detectedName ? 'needs-review' : 'available',
    synthetic: true,
    addedAt: new Date().toISOString(),
    forRequirementId: requirement.id,
    fileName,
    fileSizeBytes: sizeBytes,
    mimeType,
    metadata: {
      holderName: detectedName,
      extra: {
        'Read by': 'Simulated document reader (this prototype)',
        'Original file': fileName,
      },
    },
  };

  return {
    document,
    analysis: {
      documentId: document.id,
      checks,
      detectedName,
      detectedType,
      needsReview: checks.some((c) => c.status === 'warning'),
    },
  };
}

function friendlyName(requirement: DocumentRequirement, fileName: string): string {
  const first = requirement.examples[0];
  if (first) return first;
  return fileName;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
