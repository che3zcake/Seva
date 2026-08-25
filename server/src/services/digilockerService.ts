import type { DigiLockerAccount, DigiLockerDocument, Document } from '@seva/shared';
import { DIGILOCKER_CATALOGUE } from '../data/digilockerDocuments.js';
import { DEMO_CITIZEN_NAME } from '../data/demoCitizen.js';

/**
 * A stand-in for DigiLocker.
 *
 * No request leaves this process. The delay below exists so the UI's loading
 * state is exercised during the demo, not to imitate a real network call.
 */
const SIMULATED_LATENCY_MS = 900;

export async function connectDigiLocker(): Promise<DigiLockerAccount> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
  return {
    holderName: `Demo Citizen (${DEMO_CITIZEN_NAME})`,
    maskedId: 'demo-locker-0000',
    connectedAt: new Date().toISOString(),
    synthetic: true,
  };
}

export function listDigiLockerDocuments(): DigiLockerDocument[] {
  return DIGILOCKER_CATALOGUE;
}

export function findDigiLockerDocument(id: string): DigiLockerDocument | undefined {
  return DIGILOCKER_CATALOGUE.find((doc) => doc.id === id);
}

/** Turns a locker record into a document the citizen has chosen to use. */
export function toDocument(source: DigiLockerDocument): Document {
  return {
    id: source.id,
    name: source.name,
    type: source.type,
    issuer: source.issuer,
    source: 'digilocker',
    status: 'available',
    metadata: source.metadata,
    synthetic: true,
    addedAt: new Date().toISOString(),
  };
}
