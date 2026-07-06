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

describe('AddOnProcedureDialog', () => {
  beforeEach(() => {
    mockedProcedureDefinitions.mockResolvedValue([US_MAMARIO]);
  });

  it('busca, selecciona un estudio y lo agrega con indicación verbal del médico', async () => {
    mockedAddOnProcedure.mockResolvedValue({
      id: 'order-2', patient_id: 'patient-1', accession_number: 'AP0002', modality: 'US',
      status: 'scheduled', priority: 'routine', encounter_id: 'encounter-1',
    });
    const onCreated = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<AddOnProcedureDialog encounterId="encounter-1" patientLabel="María López" defaultSource="verbal_physician" onClose={onClose} onCreated={onCreated} />);

    fireEvent.change(await screen.findByPlaceholderText(/ultrasonido mamario/i), { target: { value: 'ultrasonido' } });
    fireEvent.click(await screen.findByText('ULTRASONIDO MAMARIO'));

    // verbal_physician is the default source -> requires "Médico solicitante".
    const submit = screen.getByRole('button', { name: 'Agregar estudio' });
    fireEvent.click(submit);
    expect(mockedAddOnProcedure).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/Dra\. Gómez/i), { target: { value: 'Dra. Gómez' } });
    fireEvent.click(submit);

    await waitFor(() => expect(mockedAddOnProcedure).toHaveBeenCalledWith('encounter-1', {
      procedure_definition_id: 'pd-us-1', source: 'verbal_physician',
      requested_by_physician: 'Dra. Gómez', reason: null,
    }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('agrega directamente con indicación del médico sin requerir médico solicitante', async () => {
    mockedAddOnProcedure.mockResolvedValue({
      id: 'order-3', patient_id: 'patient-1', accession_number: 'AP0003', modality: 'US',
      status: 'scheduled', priority: 'routine', encounter_id: 'encounter-1',
    });

    render(<AddOnProcedureDialog encounterId="encounter-1" patientLabel="María López" defaultSource="direct_physician" onClose={vi.fn()} onCreated={vi.fn().mockResolvedValue(undefined)} />);

    fireEvent.change(await screen.findByPlaceholderText(/ultrasonido mamario/i), { target: { value: 'ultrasonido' } });
    fireEvent.click(await screen.findByText('ULTRASONIDO MAMARIO'));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar estudio' }));

    await waitFor(() => expect(mockedAddOnProcedure).toHaveBeenCalledWith('encounter-1', {
      procedure_definition_id: 'pd-us-1', source: 'direct_physician',
      requested_by_physician: null, reason: null,
    }));
  });
});
