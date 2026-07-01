export type StudyStatus = 'scheduled' | 'received' | 'in-progress' | 'completed' | 'reported' | 'error';

export interface Study {
  id: string;
  patientId: string;
  studyInstanceUid?: string;
  accessionNumber?: string;
  description: string;
  modality: string;
  performedAt?: string;
  status: StudyStatus;
  seriesCount?: number;
}
