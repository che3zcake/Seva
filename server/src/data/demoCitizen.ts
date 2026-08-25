import type { CitizenProfile } from '@seva/shared';

/**
 * The one synthetic citizen this prototype knows about.
 *
 * The name here is deliberately the *short* form. Two of the synthetic
 * documents carry the long form ("Rahul Kumar Sharma"), which is what makes
 * the mismatch detection demo real rather than staged.
 */
export const DEMO_CITIZEN_NAME = 'Rahul Sharma';
export const DEMO_CITIZEN_LONG_NAME = 'Rahul Kumar Sharma';

export const DEMO_ADDRESS = '14, Nehru Nagar, Sector 4, Indore, Madhya Pradesh 452001';

/** A fresh session starts almost empty - the citizen fills this in. */
export function createEmptyProfile(): CitizenProfile {
  return {
    fullName: '',
    dateOfBirth: '',
    address: '',
    occupation: '',
    annualIncome: '',
    purpose: '',
  };
}

/** Used by the "fill with demo details" shortcut so judges can move fast. */
export function demoProfile(): CitizenProfile {
  return {
    fullName: DEMO_CITIZEN_NAME,
    dateOfBirth: '1998-07-12',
    address: DEMO_ADDRESS,
    occupation: 'Salaried employee',
    annualIncome: '186000',
    purpose: 'Education scholarship application',
  };
}
