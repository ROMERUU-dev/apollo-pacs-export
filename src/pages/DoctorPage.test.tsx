import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStudies, type StudySummary } from '../api/studies';
import { operationsApi, type Report } from '../api/operations';
import { DoctorPage } from './DoctorPage';

vi.mock('../api/studies', () => ({
  getStudies: vi.fn(),
  launchStudyViewer: vi.fn(),
  safeViewerUrl: (value?: string) => value,
}));

vi.mock('../api/operations', () => ({
  operationsApi: {
    report: vi.fn(),
    shares: vi.fn(),
    saveReport: vi.fn(),
    createShare: vi.fn(),
    revokeShare: vi.fn(),
  },
}));

const mockedGetStudies = vi.mocked(getStudies);
const mockedReport = vi.mocked(operationsApi.report);
const mockedShares = vi.mocked(operationsApi.shares);

const STUDY_A: StudySummary = {
  id: 'study-1', patientId: 'p1', patientName: 'González, María', medicalRecordNumber: 'MRN-1',
  studyInstanceUid: '1.2.3', accessionNumber: 'ACC-1', description: 'RX Tórax', modality: 'DX',
  status: 'received', viewerAvailable: true, seriesCount: 1, instanceCount: 1,
};
const STUDY_B: StudySummary = {
  id: 'study-2', patientId: 'p2', patientName: 'Pérez, Juan', medicalRecordNumber: 'MRN-2',
  studyInstanceUid: '4.5.6', accessionNumber: 'ACC-2', description: 'TC Abdomen', modality: 'CT',
  status: 'received', viewerAvailable: true, seriesCount: 1, instanceCount: 1,
};

function makeReport(studyId: string): Report {
  return {
    study_id: studyId,
    versions: [],
    latest: { id: `v-${studyId}`, version: 1, status: 'draft', content: `Reporte ${studyId}`, author: 'dr' },
  };
}

function postViewerMessage(data: unknown, origin = window.location.origin) {
  window.dispatchEvent(new MessageEvent('message', { data, origin }));
}

describe('DoctorPage viewer wiring', () => {
  beforeEach(() => {
    mockedGetStudies.mockResolvedValue({ items: [STUDY_A, STUDY_B], page: 1, pageSize: 100, total: 2, totalPages: 1 });
    mockedReport.mockImplementation((studyId: string) => Promise.resolve(makeReport(studyId)));
    mockedShares.mockResolvedValue([]);
  });

  it('muestra el nombre del paciente del estudio seleccionado en la barra del reporte', async () => {
    render(<DoctorPage />);
    await waitFor(() => expect(mockedReport).toHaveBeenCalledWith('study-1'));
    await waitFor(() => expect(document.querySelector('.report-patient')).toHaveTextContent('González, María'));
  });

  it('abre el reporte del estudio indicado por el visor (apollo:open-report)', async () => {
    render(<DoctorPage />);
    await waitFor(() => expect(mockedReport).toHaveBeenCalledWith('study-1'));
    mockedReport.mockClear();

    postViewerMessage({ type: 'apollo:open-report', studyInstanceUID: '4.5.6' });

    await waitFor(() => expect(mockedReport).toHaveBeenCalledWith('study-2'));
    await waitFor(() => expect(document.querySelector('.report-patient')).toHaveTextContent('Pérez, Juan'));
  });

  it('ignora mensajes de otro origen (no cambia el estudio seleccionado)', async () => {
    render(<DoctorPage />);
    await waitFor(() => expect(mockedReport).toHaveBeenCalledWith('study-1'));
    mockedReport.mockClear();

    postViewerMessage({ type: 'apollo:open-report', studyInstanceUID: '4.5.6' }, 'https://evil.example');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockedReport).not.toHaveBeenCalled();
    expect(document.querySelector('.report-patient')).toHaveTextContent('González, María');
  });

  it('ignora mensajes sin el tipo esperado aunque sean del mismo origen', async () => {
    render(<DoctorPage />);
    await waitFor(() => expect(mockedReport).toHaveBeenCalledWith('study-1'));
    mockedReport.mockClear();

    postViewerMessage({ type: 'something-else', studyInstanceUID: '4.5.6' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockedReport).not.toHaveBeenCalled();
    expect(screen.queryByText('Pérez, Juan')).not.toBeInTheDocument();
  });
});
