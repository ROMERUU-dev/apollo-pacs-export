import type { WorklistItem } from '../models';

/** Datos ficticios para desarrollo visual. No provienen de una worklist real. */
export const mockWorklist: WorklistItem[] = [
  {
    id: 'mock-worklist-1',
    patientId: 'mock-patient-1',
    patientName: 'GONZÁLEZ RUIZ, MARÍA',
    studyId: 'mock-study-1',
    studyDescription: 'RX Tórax PA',
    modality: 'DX',
    scheduledAt: '2026-06-29T09:12:00-07:00',
    priority: 'normal',
    status: 'sent',
  },
];
