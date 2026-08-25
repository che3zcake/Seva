import type { DigiLockerDocument } from '@seva/shared';
import { DEMO_ADDRESS, DEMO_CITIZEN_LONG_NAME, DEMO_CITIZEN_NAME } from './demoCitizen.js';

/**
 * The contents of the simulated locker.
 *
 * No network call is ever made to DigiLocker. These records are fixtures.
 * Document numbers are deliberately malformed so they cannot be mistaken for
 * real identifiers.
 */
export const DIGILOCKER_CATALOGUE: DigiLockerDocument[] = [
  {
    id: 'dl-aadhaar',
    name: 'Aadhaar Card',
    type: 'aadhaar',
    issuer: 'Demo Identity Registry (fictional)',
    digilockerRef: 'DL-SYNTH-4471',
    description: 'Commonly used as both identity proof and address proof.',
    synthetic: true,
    metadata: {
      holderName: DEMO_CITIZEN_NAME,
      documentNumber: 'XXXX-XXXX-0000 (synthetic)',
      issuedOn: '2016-03-02',
      address: DEMO_ADDRESS,
      extra: { 'Date of birth': '12 July 1998' },
    },
  },
  {
    id: 'dl-pan',
    name: 'PAN Card',
    type: 'pan',
    issuer: 'Demo Revenue Registry (fictional)',
    digilockerRef: 'DL-SYNTH-8820',
    description: 'Identity proof. Often asked for alongside income documents.',
    synthetic: true,
    metadata: {
      holderName: DEMO_CITIZEN_LONG_NAME,
      documentNumber: 'AAAAA0000A (synthetic)',
      issuedOn: '2019-11-18',
      extra: { 'Date of birth': '12 July 1998' },
    },
  },
  {
    id: 'dl-driving-licence',
    name: 'Driving Licence',
    type: 'driving-licence',
    issuer: 'Demo Transport Authority (fictional)',
    digilockerRef: 'DL-SYNTH-1093',
    description: 'Can stand in for identity or address proof.',
    synthetic: true,
    metadata: {
      holderName: DEMO_CITIZEN_NAME,
      documentNumber: 'DEMO-DL-000000 (synthetic)',
      issuedOn: '2021-01-25',
      address: DEMO_ADDRESS,
      extra: { 'Valid until': '2041-01-24' },
    },
  },
  {
    id: 'dl-class-10',
    name: 'Class 10 Certificate',
    type: 'school-certificate',
    issuer: 'Demo School Examination Board (fictional)',
    digilockerRef: 'DL-SYNTH-6612',
    description: 'Usually accepted as proof of date of birth.',
    synthetic: true,
    metadata: {
      holderName: DEMO_CITIZEN_NAME,
      documentNumber: 'DEMO-R-0000000 (synthetic)',
      issuedOn: '2014-06-01',
      extra: { 'Date of birth': '12 July 1998', 'Year of passing': '2014' },
    },
  },
  {
    id: 'dl-electricity-bill',
    name: 'Electricity Bill',
    type: 'utility-bill',
    issuer: 'Demo Power Distribution Co. (fictional)',
    digilockerRef: 'DL-SYNTH-3357',
    description: 'A recent bill is often accepted as address proof.',
    synthetic: true,
    metadata: {
      holderName: DEMO_CITIZEN_LONG_NAME,
      documentNumber: 'DEMO-ACC-778812 (synthetic)',
      issuedOn: '2025-06-04',
      address: DEMO_ADDRESS,
      extra: { 'Billing month': 'June 2025' },
    },
  },
];
