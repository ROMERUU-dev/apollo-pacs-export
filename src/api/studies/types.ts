import type { Study, StudyStatus } from '../../models';

export interface StudySearchParams {
  page?: number;
  pageSize?: number;
  search?: string;
  modality?: string;
  status?: StudyStatus | '';
  dateFrom?: string;
  dateTo?: string;
}

export interface StudySummary extends Study {
  patientName: string;
  medicalRecordNumber?: string;
  viewerAvailable: boolean;
  instanceCount: number;
}

export interface PaginatedStudies {
  items: StudySummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ViewerLaunchResponse {
  viewerUrl: string;
}
