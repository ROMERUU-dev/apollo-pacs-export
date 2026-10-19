import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DoctorPage } from './DoctorPage';
import { getStudies, launchStudyViewer } from '../api/studies';
import { operationsApi } from '../api/operations';

vi.mock('../api/studies', () => ({
  getStudies: vi.fn(),
  launchStudyViewer: vi.fn(),
  safeViewerUrl: (url?: string) => url,
}));

vi.mock('../api/operations', () => ({
  operationsApi: {
    report: vi.fn(),
    shares: vi.fn(),
    ordersByAccession: vi.fn(),
    saveReport: vi.fn(),
    createShare: vi.fn(),
    revokeShare: vi.fn(),
  },
}));

const mockedGetStudies = vi.mocked(getStudies);
const mockedLaunchViewer = vi.mocked(launchStudyViewer);
const mockedReport = vi.mocked(operationsApi.report);
const mockedShares = vi.mocked(operationsApi.shares);
const mockedOrdersByAccession = vi.mocked(operationsApi.ordersByAccession);

const STUDY = {
  id: 'study-1', patientId: 'patient-1', description: 'US mamario', modality: 'US', status: 'received' as const,
  patientName: 'Paciente, Prueba', viewerAvailable: true, instanceCount: 1, accessionNumber: 'ACC-1',
  studyInstanceUid: '1.2.3',
};

describe('DoctorPage (lista + reporte, visor en pestaña)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedGetStudies.mockResolvedValue({ items: [STUDY], page: 1, pageSize: 100, total: 1, totalPages: 1 });
    mockedReport.mockResolvedValue({ study_id: 'study-1', versions: [], latest: undefined, final: undefined });
    mockedShares.mockResolvedValue([]);
    mockedOrdersByAccession.mockResolvedValue([]);
    mockedLaunchViewer.mockResolvedValue({ viewerUrl: '/ohif/apollo-full?StudyInstanceUIDs=1.2.3' });
  });

  it('opens the apollo-full viewer in a new tab when a study is opened', async () => {
    const fakeWin = { location: { href: '' }, close: vi.fn() } as unknown as Window;
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWin);
    render(<DoctorPage />);
    const card = await screen.findByText('US mamario');

    // Opening on mount must NOT pop a tab — only an explicit click does.
    expect(openSpy).not.toHaveBeenCalled();

    fireEvent.click(card.closest('button')!);
    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(mockedLaunchViewer).toHaveBeenCalledWith('study-1');
    await waitFor(() => expect((fakeWin as { location: { href: string } }).location.href).toContain('/ohif/apollo-full'));
    openSpy.mockRestore();
  });

  it('collapses and re-expands the reporter panel', async () => {
    render(<DoctorPage />);
    await screen.findByText('US mamario');
    expect(screen.getByText('REPORTE')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Colapsar reporte'));
    expect(screen.queryByText('REPORTE')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Expandir reporte'));
    expect(screen.getByText('REPORTE')).toBeInTheDocument();
  });

  it('persists the reporter collapse preference to localStorage as a plain boolean', async () => {
    render(<DoctorPage />);
    await screen.findByText('US mamario');

    fireEvent.click(screen.getByLabelText('Colapsar reporte'));
    expect(localStorage.getItem('medicalReporterPanelCollapsed')).toBe('true');

    fireEvent.click(screen.getByLabelText('Expandir reporte'));
    expect(localStorage.getItem('medicalReporterPanelCollapsed')).toBe('false');
  });

  it('preserves report draft content across collapse and expand', async () => {
    render(<DoctorPage />);
    await screen.findByText('US mamario');

    const editor = await screen.findByRole('textbox');
    editor.innerHTML = '<p>HALLAZGOS: prueba de persistencia</p>';
    fireEvent.input(editor);

    fireEvent.click(screen.getByLabelText('Colapsar reporte'));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Expandir reporte'));
    expect(screen.getByRole('textbox')).toHaveTextContent('prueba de persistencia');
  });
});
