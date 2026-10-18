import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { operationsApi } from '../../api/operations';
import { AddOnProcedureDialog } from './AddOnProcedureDialog';

vi.mock('../../api/operations', () => ({
  operationsApi: {
    procedureDefinitions: vi.fn(),
    addOnProcedure: vi.fn(),
  },
}));

const mockedProcedureDefinitions = vi.mocked(operationsApi.procedureDefinitions);
const mockedAddOnProcedure = vi.mocked(operationsApi.addOnProcedure);

const US_MAMARIO = { id: 'pd-us-1', code: 'PD-US', name: 'Ultrasonido mamario', modality: 'US', is_active: true };
const MG_BILATERAL = { id: 'pd-mg-1', code: 'PD-MG', name: 'Mastografía bilateral', modality: 'MG', is_active: true };
const TORAX = { id: 'pd-dx-1', code: 'PD-DX', name: 'Tórax PA y LAT', modality: 'DX', is_active: true };

const LIBRARY = [US_MAMARIO, MG_BILATERAL, TORAX];

describe('AddOnProcedureDialog', () => {
  beforeEach(() => {
    mockedProcedureDefinitions.mockResolvedValue(LIBRARY);
  });

  it('shows more than two studies from the real API', async () => {
    render(<AddOnProcedureDialog encounterId="encounter-1" patientLabel="María López" defaultSource="direct_physician" onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(await screen.findByText('Ultrasonido mamario')).toBeInTheDocument();
    expect(screen.getByText('Mastografía bilateral')).toBeInTheDocument();
    expect(screen.getByText('Tórax PA y LAT')).toBeInTheDocument();
    expect(mockedProcedureDefinitions).toHaveBeenCalledWith(true);
  });

  it('filtra por texto de búsqueda', async () => {
    render(<AddOnProcedureDialog encounterId="encounter-1" patientLabel="María López" defaultSource="direct_physician" onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByText('Ultrasonido mamario');
    fireEvent.change(screen.getByPlaceholderText(/ultrasonido mamario/i), { target: { value: 'tórax' } });
    expect(screen.getByText('Tórax PA y LAT')).toBeInTheDocument();
    expect(screen.queryByText('Ultrasonido mamario')).not.toBeInTheDocument();
    expect(screen.queryByText('Mastografía bilateral')).not.toBeInTheDocument();
  });

  it('filtra por chip de modalidad', async () => {
    render(<AddOnProcedureDialog encounterId="encounter-1" patientLabel="María López" defaultSource="direct_physician" onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByText('Ultrasonido mamario');
    fireEvent.click(screen.getByRole('button', { name: 'MG' }));
    expect(screen.getByText('Mastografía bilateral')).toBeInTheDocument();
    expect(screen.queryByText('Ultrasonido mamario')).not.toBeInTheDocument();
    expect(screen.queryByText('Tórax PA y LAT')).not.toBeInTheDocument();
  });

  it('agrega un estudio sin ningún detalle opcional (solo la selección es obligatoria)', async () => {
    mockedAddOnProcedure.mockResolvedValue({
      id: 'order-2', patient_id: 'patient-1', accession_number: 'AP0002', modality: 'US',
      status: 'scheduled', priority: 'routine', encounter_id: 'encounter-1',
    });
    const onCreated = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<AddOnProcedureDialog encounterId="encounter-1" patientLabel="María López" defaultSource="verbal_physician" onClose={onClose} onCreated={onCreated} />);

    fireEvent.click(await screen.findByText('Ultrasonido mamario'));
    // No "Detalles opcionales" expansion, no physician, no reason -- must still work.
    fireEvent.click(screen.getByRole('button', { name: 'Agregar estudio' }));

    await waitFor(() => expect(mockedAddOnProcedure).toHaveBeenCalledWith('encounter-1', {
      procedure_definition_id: 'pd-us-1', source: 'verbal_physician',
      requested_by_physician: null, reason: null,
    }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('doctor default es direct_physician y agrega sin requerir médico solicitante', async () => {
    mockedAddOnProcedure.mockResolvedValue({
      id: 'order-3', patient_id: 'patient-1', accession_number: 'AP0003', modality: 'US',
      status: 'scheduled', priority: 'routine', encounter_id: 'encounter-1',
    });

    render(<AddOnProcedureDialog encounterId="encounter-1" patientLabel="María López" defaultSource="direct_physician" onClose={vi.fn()} onCreated={vi.fn().mockResolvedValue(undefined)} />);

    fireEvent.click(await screen.findByText('Ultrasonido mamario'));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar estudio' }));

    await waitFor(() => expect(mockedAddOnProcedure).toHaveBeenCalledWith('encounter-1', {
      procedure_definition_id: 'pd-us-1', source: 'direct_physician',
      requested_by_physician: null, reason: null,
    }));
  });

  it('permite expandir Detalles opcionales y registrar médico solicitante', async () => {
    mockedAddOnProcedure.mockResolvedValue({
      id: 'order-4', patient_id: 'patient-1', accession_number: 'AP0004', modality: 'US',
      status: 'scheduled', priority: 'routine', encounter_id: 'encounter-1',
    });

    render(<AddOnProcedureDialog encounterId="encounter-1" patientLabel="María López" defaultSource="verbal_physician" onClose={vi.fn()} onCreated={vi.fn().mockResolvedValue(undefined)} />);

    fireEvent.click(await screen.findByText('Ultrasonido mamario'));
    expect(screen.queryByPlaceholderText(/Dra\. Gómez/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Detalles opcionales/ }));
    fireEvent.change(screen.getByPlaceholderText(/Dra\. Gómez/i), { target: { value: 'Dra. Gómez' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar estudio' }));

    await waitFor(() => expect(mockedAddOnProcedure).toHaveBeenCalledWith('encounter-1', {
      procedure_definition_id: 'pd-us-1', source: 'verbal_physician',
      requested_by_physician: 'Dra. Gómez', reason: null,
    }));
  });
});
