export type AdministrativeSex = 'female' | 'male' | 'other' | 'unknown';

export interface Patient {
  id: string;
  medicalRecordNumber: string;
  givenNames: string;
  familyName: string;
  secondFamilyName?: string;
  birthDate?: string;
  sex: AdministrativeSex;
  phone?: string;
  email?: string;
}
