export type WorklistPriority = 'normal' | 'urgent';
export type WorklistStatus = 'received' | 'pending' | 'sent' | 'error';

export interface WorklistItem {
  id: string;
  patientId: string;
  patientName: string;
  studyId?: string;
  studyDescription: string;
  modality: string;
  scheduledAt?: string;
  priority: WorklistPriority;
  status: WorklistStatus;
}
