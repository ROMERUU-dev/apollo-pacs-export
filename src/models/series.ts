export interface Series {
  id: string;
  studyId: string;
  seriesInstanceUid?: string;
  seriesNumber?: number;
  description?: string;
  modality: string;
  instanceCount?: number;
}
