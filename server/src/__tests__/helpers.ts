import type { CitizenProfile, Document, DocumentType } from '@taiyaar/shared';

export function doc(
  id: string,
  type: DocumentType,
  overrides: Partial<Document> = {},
): Document {
  return {
    id,
    name: id,
    type,
    issuer: 'Demo issuer (fictional)',
    source: 'digilocker',
    status: 'available',
    metadata: {},
    synthetic: true,
    addedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function profile(overrides: Partial<CitizenProfile> = {}): CitizenProfile {
  return {
    fullName: 'Rahul Sharma',
    dateOfBirth: '1998-07-12',
    address: '14, Nehru Nagar, Indore, Madhya Pradesh 452001',
    occupation: 'Salaried employee',
    annualIncome: '186000',
    purpose: 'Education scholarship application',
    ...overrides,
  };
}

export function emptyProfile(): CitizenProfile {
  return {
    fullName: '',
    dateOfBirth: '',
    address: '',
    occupation: '',
    annualIncome: '',
    purpose: '',
  };
}
