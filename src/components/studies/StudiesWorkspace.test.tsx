import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStudies, launchStudyViewer } from '../../api/studies';
import { StudiesWorkspace } from './StudiesWorkspace';

vi.mock('../../api/studies', () => ({
  getStudies: vi.fn(),
  launchStudyViewer: vi.fn(),
}));

const mockedGetStudies = vi.mocked(getStudies);
const mockedLaunchStudyViewer = vi.mocked(launchStudyViewer);

describe('StudiesWorkspace', () => {
  beforeEach(() => {
    mockedGetStudies.mockResolvedValue({
      items: [{
        id: 'study-1',
        patientId: 'patient-1',
        patientName: 'González, María',
        medicalRecordNumber: 'MRN-1',
        description: 'RX Tórax',
        modality: 'DX',
        status: 'received',
        viewerAvailable: true,
        instanceCount: 1,
      }],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('carga estudios reales y muestra el visor al seleccionar', async () => {
    mockedLaunchStudyViewer.mockResolvedValue({ viewerUrl: '/ohif/viewer?StudyInstanceUIDs=1.2.3' });
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<StudiesWorkspace />);

    expect(await screen.findByText('González, María')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /González, María/i }));

    fireEvent.click(screen.getByRole('button', { name: 'Abrir visor' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith(
      '/ohif/viewer?StudyInstanceUIDs=1.2.3', '_blank', 'noopener,noreferrer',
    ));
    open.mockRestore();
  });

  it('envía búsqueda y filtros al servicio', async () => {
    render(<StudiesWorkspace />);
    await screen.findByText('González, María');

    fireEvent.change(screen.getByPlaceholderText(/Paciente, PatientID/i), {
      target: { value: 'ACC-1' },
    });
    fireEvent.change(screen.getByLabelText('Modalidad'), { target: { value: 'CT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() => expect(mockedGetStudies).toHaveBeenLastCalledWith(expect.objectContaining({
      search: 'ACC-1',
      modality: 'CT',
      page: 1,
      pageSize: 20,
    })));
  });

  it('muestra error y permite reintentar', async () => {
    mockedGetStudies.mockRejectedValueOnce(new Error('Backend fuera de línea'));

    render(<StudiesWorkspace />);

    expect(await screen.findByText('Backend fuera de línea')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('González, María')).toBeInTheDocument();
  });
});
