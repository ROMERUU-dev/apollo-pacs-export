import type { Patient } from '../models';

/** Datos ficticios para desarrollo visual. No usar como datos clínicos reales. */
export const mockPatients: Patient[] = [
  {
    id: 'mock-patient-1',
    medicalRecordNumber: 'MRN-024518',
    givenNames: 'María',
    familyName: 'González',
    secondFamilyName: 'Ruiz',
    birthDate: '1985-01-01',
    sex: 'female',
    phone: '000 000 0000',
    email: 'paciente@example.invalid',
  },
];
