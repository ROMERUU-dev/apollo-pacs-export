import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DoctorPage } from './DoctorPage';
import { getStudies } from '../api/studies';
import { operationsApi } from '../api/operations';

vi.mock('../api/studies', () => ({
  getStudies: vi.fn(),
  launchStudyViewer: vi.fn(),
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
const mockedReport = vi.mocked(operationsApi.report);
const mockedShares = vi.mocked(operationsApi.shares);
const mockedOrdersByAccession = vi.mocked(operationsApi.ordersByAccession);

const STUDY = {
  id: 'study-1', patientId: 'patient-1', description: 'US mamario', modality: 'US', status: 'received' as const,
  patientName: 'Paciente, Prueba', viewerAvailable: true, instanceCount: 1, accessionNumber: 'ACC-1',
};

describe('DoctorPage panel collapse (Lote C5)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedGetStudies.mockResolvedValue({ items: [STUDY], page: 1, pageSize: 100, total: 1, totalPages: 1 });
    mockedReport.mockResolvedValue({ study_id: 'study-1', versions: [], latest: undefined, final: undefined });
    mockedShares.mockResolvedValue([]);
    mockedOrdersByAccession.mockResolvedValue([]);
  });

  it('collapses and re-expands the patients panel', async () => {
    render(<DoctorPage />);
    await screen.findByText('US mamario');
    expect(screen.getByText('Pendientes')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Colapsar lista de pacientes'));
    expect(screen.queryByText('Pendientes')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Expandir lista de pacientes'));
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
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

  it('allows both panels collapsed at once, leaving the viewer visible', async () => {
    render(<DoctorPage />);
    await screen.findByText('US mamario');

    fireEvent.click(screen.getByLabelText('Colapsar lista de pacientes'));
    fireEvent.click(screen.getByLabelText('Colapsar reporte'));

    expect(screen.queryByText('Pendientes')).not.toBeInTheDocument();
    expect(screen.queryByText('REPORTE')).not.toBeInTheDocument();
    expect(screen.getByText(/Visor DICOM conectado/)).toBeInTheDocument();
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

  it('persists the collapse preference to localStorage as a plain boolean', async () => {
    render(<DoctorPage />);
    await screen.findByText('US mamario');

    fireEvent.click(screen.getByLabelText('Colapsar lista de pacientes'));
    expect(localStorage.getItem('medicalPatientsPanelCollapsed')).toBe('true');

    fireEvent.click(screen.getByLabelText('Expandir lista de pacientes'));
    expect(localStorage.getItem('medicalPatientsPanelCollapsed')).toBe('false');
  });
});
