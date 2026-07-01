export type ReportStatus = 'draft' | 'preliminary' | 'final' | 'amended';

export interface Report {
  id: string;
  studyId: string;
  status: ReportStatus;
  body: string;
  authorId?: string;
  createdAt: string;
  updatedAt: string;
  signedAt?: string;
}
