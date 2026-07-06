import type { StudyStatus } from '../../models';
import { apiRequest, apiRequestWithResponse } from '../client';
import { apiConfig } from '../config';
import type { PaginatedStudies, StudySearchParams, StudySummary, ViewerLaunchResponse } from './types';

const STUDIES_TIMEOUT_MS = 10_000;
const DEFAULT_PAGE_SIZE = 20;

interface StudyRead {
  id: string;
  study_instance_uid: string;
  patient_id: string | null;
  patient_name: string;
  medical_record_number: string | null;
  accession_number: string | null;
  description: string | null;
  performed_at: string | null;
  modality: string;
  modalities: string[];
  status: 'registered' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | null;
  series_count: number;
  instance_count: number;
  viewer_available: boolean;
}

interface ViewerLaunchRead {
  viewer_url: string;
}

const STATUS_MAP: Record<NonNullable<StudyRead['status']>, StudyStatus> = {
  registered: 'received',
  scheduled: 'scheduled',
  in_progress: 'in-progress',
  completed: 'completed',
  cancelled: 'error',
};

function mapStudy(study: StudyRead): StudySummary {
  return {
    id: study.id,
    patientId: study.patient_id ?? study.medical_record_number ?? 'unreconciled',
    patientName: study.patient_name,
    medicalRecordNumber: study.medical_record_number ?? undefined,
    studyInstanceUid: study.study_instance_uid,
    accessionNumber: study.accession_number ?? undefined,
    description: study.description ?? 'Estudio sin descripción',
    modality: study.modality,
    performedAt: study.performed_at ?? undefined,
    status: study.status ? STATUS_MAP[study.status] : 'received',
    seriesCount: study.series_count,
    instanceCount: study.instance_count,
    viewerAvailable: study.viewer_available,
  };
}

export async function getStudies(params: StudySearchParams = {}): Promise<PaginatedStudies> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  const query = new URLSearchParams({
    limit: String(pageSize),
    offset: String((page - 1) * pageSize),
  });

  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.modality?.trim()) query.set('modality', params.modality.trim());
  if (params.status) {
    const filterStatus: Partial<Record<StudyStatus, string>> = {
      received: 'registered',
      scheduled: 'scheduled',
      'in-progress': 'in_progress',
      completed: 'completed',
      error: 'cancelled',
    };
    const backendStatus = filterStatus[params.status];
    if (backendStatus) query.set('status', backendStatus);
  }
  if (params.dateFrom) query.set('date_from', params.dateFrom);
  if (params.dateTo) query.set('date_to', params.dateTo);

  const { data, response } = await apiRequestWithResponse<StudyRead[]>(
    apiConfig.studiesPath + '?' + query.toString(),
    { method: 'GET', timeoutMs: STUDIES_TIMEOUT_MS },
  );
  const items = (data ?? []).map(mapStudy);
  const total = Number(response.headers.get('X-Total-Count'));
  const safeTotal = Number.isFinite(total) ? total : items.length;
  return {
    items,
    page,
    pageSize,
    total: safeTotal,
    totalPages: Math.max(1, Math.ceil(safeTotal / pageSize)),
  };
}

export async function launchStudyViewer(studyId: string): Promise<ViewerLaunchResponse> {
  const payload = await apiRequest<ViewerLaunchRead>(
    apiConfig.studiesPath + '/' + encodeURIComponent(studyId) + '/viewer-launch',
    { method: 'POST', timeoutMs: STUDIES_TIMEOUT_MS },
  );
  if (!payload?.viewer_url) throw new Error('Apollo no devolvió una URL de visor.');
  return { viewerUrl: payload.viewer_url };
}
