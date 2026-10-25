import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DoctorPage } from './DoctorPage';
import { getStudies, launchStudyViewer } from '../api/studies';

vi.mock('../api/studies', () => ({
  getStudies: vi.fn(),
  launchStudyViewer: vi.fn(),
  safeViewerUrl: (url?: string) => url,
}));

const mockedGetStudies = vi.mocked(getStudies);
const mockedLaunchViewer = vi.mocked(launchStudyViewer);

const STUDY = {
  id: 'study-1', patientId: 'patient-1', description: 'US mamario', modality: 'US', status: 'received' as const,
  patientName: 'Paciente, Prueba', viewerAvailable: true, instanceCount: 1, accessionNumber: 'ACC-1', studyInstanceUid: '1.2.3',
};
const OTHER = {
  ...STUDY, id: 'study-2', description: 'Tórax PA', modality: 'DX', patientName: 'Otro, Nombre', accessionNumber: 'ACC-2', studyInstanceUid: '1.2.4',
};

describe('DoctorPage (lista de estudios)', () => {
  beforeEach(() => {
    mockedGetStudies.mockResolvedValue({ items: [STUDY, OTHER], page: 1, pageSize: 200, total: 2, totalPages: 1 });
    mockedLaunchViewer.mockResolvedValue({ viewerUrl: '/ohif/apollo-full?StudyInstanceUIDs=1.2.3' });
  });

  it('lists studies and filters by the search box', async () => {
    render(<DoctorPage />);
    await screen.findByText('US mamario');
    expect(screen.getByText('Tórax PA')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar estudios'), { target: { value: 'tórax' } });
    expect(screen.queryByText('US mamario')).not.toBeInTheDocument();
    expect(screen.getByText('Tórax PA')).toBeInTheDocument();
  });

  it('opens the apollo-full viewer in a new tab (with apolloStudyId) when a study is opened', async () => {
    const fakeWin = { location: { href: '' }, close: vi.fn() } as unknown as Window;
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWin);
    render(<DoctorPage />);
    const card = await screen.findByText('US mamario');

    fireEvent.click(card.closest('button')!);
    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(mockedLaunchViewer).toHaveBeenCalledWith('study-1');
    await waitFor(() =>
      expect((fakeWin as { location: { href: string } }).location.href).toContain('apolloStudyId=study-1')
    );
    openSpy.mockRestore();
  });
});
