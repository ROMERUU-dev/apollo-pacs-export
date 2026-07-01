import type { Study } from '../models';

/** Datos ficticios para desarrollo visual. No representan recursos de Orthanc. */
export const mockStudies: Study[] = [
  {
    id: 'mock-study-1',
    patientId: 'mock-patient-1',
    description: 'RX Tórax PA',
    modality: 'DX',
    performedAt: '2026-06-29T09:12:00-07:00',
    status: 'reported',
    seriesCount: 1,
  },
];
