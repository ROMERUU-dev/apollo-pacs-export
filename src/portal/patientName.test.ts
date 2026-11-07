import { describe, expect, it } from 'vitest';
import { formatPatientName } from './patientName';

describe('formatPatientName', () => {
  it('convierte el formato DICOM a nombres y apellidos con mayúsculas iniciales', () => {
    expect(formatPatientName('GARCIA LOPEZ^MARIA FERNANDA')).toBe('Maria Fernanda Garcia Lopez');
    expect(formatPatientName('APOLLO^RC8STAGING')).toBe('Rc8staging Apollo');
    expect(formatPatientName('DE LA CRUZ^JUAN^CARLOS')).toBe('Juan Carlos de la Cruz');
  });
  it('respeta nombres ya escritos y partículas', () => {
    expect(formatPatientName('Pérez Valdés Ana-María')).toBe('Pérez Valdés Ana-María');
    expect(formatPatientName("O'NEIL^SEAN")).toBe("Sean O'Neil");
  });
  it('tiene un valor seguro cuando no hay nombre', () => {
    expect(formatPatientName('')).toBe('Paciente');
    expect(formatPatientName(undefined)).toBe('Paciente');
    expect(formatPatientName('^')).toBe('Paciente');
  });
});
