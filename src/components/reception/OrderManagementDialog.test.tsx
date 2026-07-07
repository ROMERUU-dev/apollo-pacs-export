import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { operationsApi } from '../../api/operations';
import { OrderManagementDialog } from './OrderManagementDialog';

vi.mock('../../api/operations', () => ({
  operationsApi: {
    updateOrderSchedule: vi.fn(),
    cancelOrder: vi.fn(),
    charges: vi.fn(),
    createAdjustment: vi.fn(),
    reverseAdjustment: vi.fn(),
    resolveFinancialReview: vi.fn(),
    catalog: vi.fn(),
    encounterCoverage: vi.fn(),
    payers: vi.fn(),
    payerContracts: vi.fn(),
    setEncounterCoverage: vi.fn(),
    payerResolution: vi.fn(),
    overridePayerResolution: vi.fn(),
  },
}));

const mockedCharges = vi.mocked(operationsApi.charges);
const mockedCreateAdjustment = vi.mocked(operationsApi.createAdjustment);
const mockedResolveFinancialReview = vi.mocked(operationsApi.resolveFinancialReview);
const mockedCatalog = vi.mocked(operationsApi.catalog);
const mockedEncounterCoverage = vi.mocked(operationsApi.encounterCoverage);
const mockedPayers = vi.mocked(operationsApi.payers);
const mockedPayerContracts = vi.mocked(operationsApi.payerContracts);
const mockedSetEncounterCoverage = vi.mocked(operationsApi.setEncounterCoverage);
const mockedPayerResolution = vi.mocked(operationsApi.payerResolution);
const mockedOverridePayerResolution = vi.mocked(operationsApi.overridePayerResolution);

const BASE_ORDER = {
  id: 'order-1', patient_id: 'p1', accession_number: 'ACC-1', modality: 'US', status: 'scheduled' as const,
  priority: 'routine' as const, description: 'US Abdomen', encounter_id: 'encounter-1', imaging_service_request_id: 'isr-1',
};

const CHARGE = {
  id: 'charge-1', encounter_id: 'encounter-1', imaging_service_request_id: 'isr-1',
  code_snapshot: 'OFFERING-US', name_snapshot: 'US Abdomen', base_amount: '1200.00', currency: 'MXN' as const,
  created_by: 'test', created_at: new Date().toISOString(), adjustments: [], net_amount: '1200.00',
};

describe('OrderManagementDialog - Financiero (Lote F1)', () => {
  beforeEach(() => {
    mockedCharges.mockResolvedValue([CHARGE]);
    mockedEncounterCoverage.mockResolvedValue(undefined);
    mockedPayers.mockResolvedValue([]);
    mockedPayerResolution.mockResolvedValue(undefined);
  });

  it('muestra precio base y neto de la orden', async () => {
    render(<OrderManagementDialog order={BASE_ORDER} onClose={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Financiero' }));
    await screen.findByText('Total');
    expect(screen.getAllByText('$1200.00 MXN')).toHaveLength(2); // base and net are equal with no adjustments
  });

  it('aplica un descuento porcentual y recarga el neto', async () => {
    mockedCreateAdjustment.mockResolvedValue({
      id: 'adj-1', charge_id: 'charge-1', type: 'percentage_discount', amount: '240.00', percentage: '20',
      created_by: 'test', created_at: new Date().toISOString(), is_active: true,
    });
    const discounted = { ...CHARGE, adjustments: [{
      id: 'adj-1', charge_id: 'charge-1', type: 'percentage_discount' as const, amount: '240.00', percentage: '20',
      created_by: 'test', created_at: new Date().toISOString(), is_active: true,
    }], net_amount: '960.00' };
    mockedCharges.mockResolvedValueOnce([CHARGE]).mockResolvedValueOnce([discounted]);

    render(<OrderManagementDialog order={BASE_ORDER} onClose={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Financiero' }));
    await screen.findByText('Total');
    fireEvent.click(screen.getByRole('button', { name: '+ Aplicar ajuste' }));

    const dialog = within(screen.getAllByRole('dialog')[1]);
    fireEvent.change(dialog.getByLabelText('Porcentaje'), { target: { value: '20' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Aplicar ajuste' }));

    await waitFor(() => expect(mockedCreateAdjustment).toHaveBeenCalledWith('charge-1', { type: 'percentage_discount', percentage: '20' }));
  });

  it('cortesía no requiere monto', async () => {
    mockedCreateAdjustment.mockResolvedValue({
      id: 'adj-2', charge_id: 'charge-1', type: 'courtesy', amount: '1200.00',
      created_by: 'test', created_at: new Date().toISOString(), is_active: true,
    });

    render(<OrderManagementDialog order={BASE_ORDER} onClose={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Financiero' }));
    await screen.findByText('Total');
    fireEvent.click(screen.getByRole('button', { name: '+ Aplicar ajuste' }));

    const dialog = within(screen.getAllByRole('dialog')[1]);
    fireEvent.change(dialog.getByLabelText('Tipo de ajuste'), { target: { value: 'courtesy' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Aplicar ajuste' }));

    await waitFor(() => expect(mockedCreateAdjustment).toHaveBeenCalledWith('charge-1', { type: 'courtesy' }));
  });

  it('apoyo social exige motivo antes de enviar', async () => {
    render(<OrderManagementDialog order={BASE_ORDER} onClose={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Financiero' }));
    await screen.findByText('Total');
    fireEvent.click(screen.getByRole('button', { name: '+ Aplicar ajuste' }));

    const dialog = within(screen.getAllByRole('dialog')[1]);
    fireEvent.change(dialog.getByLabelText('Tipo de ajuste'), { target: { value: 'social_support' } });
    fireEvent.change(dialog.getByLabelText('Monto'), { target: { value: '700' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Aplicar ajuste' }));

    expect(mockedCreateAdjustment).not.toHaveBeenCalled();
  });

  it('muestra add-on pendiente de revisión y permite resolverlo sin opciones de asegurador', async () => {
    mockedCatalog.mockResolvedValue([
      { id: 'offering-1', code: 'OFFERING-US', name: 'US Mamario', amount: '800.00', currency: 'MXN', is_active: true },
    ]);
    mockedResolveFinancialReview.mockResolvedValue({ ...CHARGE, base_amount: '800.00', net_amount: '800.00' });

    const pendingOrder = { ...BASE_ORDER, financial_resolution_status: 'review_required' };
    render(<OrderManagementDialog order={pendingOrder} onClose={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Financiero' }));

    expect(await screen.findByText('Estado financiero: Pendiente de revisión')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }));

    const dialog = within(screen.getAllByRole('dialog')[1]);
    expect(dialog.queryByText(/asegurador/i)).not.toBeInTheDocument();
    expect(dialog.queryByText(/payer/i)).not.toBeInTheDocument();

    fireEvent.click(await dialog.findByText('US Mamario'));
    fireEvent.click(dialog.getByRole('button', { name: 'Resolver' }));

    await waitFor(() => expect(mockedResolveFinancialReview).toHaveBeenCalledWith('order-1', { catalog_item_id: 'offering-1', adjustment: undefined }));
  });
});

describe('OrderManagementDialog - Cobertura y resolución de pagador (Lote F2)', () => {
  const ORDER_WITH_PROCEDURE = { ...BASE_ORDER, procedure_definition_id: 'pd-us-1' };

  beforeEach(() => {
    mockedCharges.mockResolvedValue([CHARGE]);
    mockedPayers.mockResolvedValue([{ id: 'payer-1', code: 'ISSSTESON', name: 'ISSSTESON', is_active: true, created_at: '', updated_at: '' }]);
    mockedPayerContracts.mockResolvedValue([{ id: 'contract-1', payer_id: 'payer-1', name: 'Convenio 2026', valid_from: '2026-01-01', is_active: true, created_at: '', updated_at: '' }]);
  });

  it('muestra particular por defecto y permite asignar cobertura', async () => {
    mockedEncounterCoverage.mockResolvedValue(undefined);
    mockedPayerResolution.mockResolvedValue(undefined);
    mockedSetEncounterCoverage.mockResolvedValue({
      id: 'coverage-1', encounter_id: 'encounter-1', payer_id: 'payer-1', contract_id: 'contract-1',
      is_primary: true, is_active: true, created_by: 'test', created_at: '',
    });

    render(<OrderManagementDialog order={BASE_ORDER} onClose={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Financiero' }));
    expect(await screen.findByText('Particular')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Asignar cobertura' }));
    const dialog = within(screen.getAllByRole('dialog')[1]);
    await dialog.findByText('ISSSTESON'); // wait for the payer <option> to actually load before selecting it
    fireEvent.change(dialog.getByLabelText('Cobertura'), { target: { value: 'payer-1' } });
    await dialog.findByLabelText('Convenio');
    fireEvent.click(dialog.getByRole('button', { name: 'Asignar cobertura' }));

    await waitFor(() => expect(mockedSetEncounterCoverage).toHaveBeenCalledWith('encounter-1', { payer_id: 'payer-1', contract_id: null }));
  });

  it('muestra elegible con tarifa de convenio', async () => {
    mockedEncounterCoverage.mockResolvedValue({
      id: 'coverage-1', encounter_id: 'encounter-1', payer_id: 'payer-1', contract_id: 'contract-1',
      is_primary: true, is_active: true, created_by: 'test', created_at: '',
    });
    mockedPayerResolution.mockResolvedValue({
      id: 'res-1', order_id: 'order-1', payer_id: 'payer-1', contract_id: 'contract-1', procedure_definition_id: 'pd-us-1',
      eligibility_status: 'eligible', tariff_amount: '750.00', currency: 'MXN', requires_authorization: false,
      resolution_source: 'contract_tariff', resolved_by: 'test', resolved_at: '',
    });

    render(<OrderManagementDialog order={ORDER_WITH_PROCEDURE} onClose={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Financiero' }));

    expect(await screen.findByText('✓ Elegible')).toBeInTheDocument();
    expect(screen.getByText('Tarifa convenio: $750.00 MXN')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Autorizar excepción' })).not.toBeInTheDocument();
  });

  it('muestra no elegible y permite autorizar una excepción', async () => {
    mockedEncounterCoverage.mockResolvedValue({
      id: 'coverage-1', encounter_id: 'encounter-1', payer_id: 'payer-1', contract_id: 'contract-1',
      is_primary: true, is_active: true, created_by: 'test', created_at: '',
    });
    mockedPayerResolution.mockResolvedValue({
      id: 'res-1', order_id: 'order-1', payer_id: 'payer-1', contract_id: 'contract-1', procedure_definition_id: 'pd-us-1',
      eligibility_status: 'ineligible', requires_authorization: false,
      resolution_source: 'contract_tariff', resolved_by: 'test', resolved_at: '',
    });
    mockedOverridePayerResolution.mockResolvedValue({
      id: 'res-1', order_id: 'order-1', payer_id: 'payer-1', contract_id: 'contract-1', procedure_definition_id: 'pd-us-1',
      eligibility_status: 'eligible', tariff_amount: '700.00', currency: 'MXN', requires_authorization: true,
      authorization_reference: 'FOLIO-1', resolution_source: 'authorized_override', resolved_by: 'test', resolved_at: '',
    });

    render(<OrderManagementDialog order={ORDER_WITH_PROCEDURE} onClose={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Financiero' }));

    expect(await screen.findByText('✕ No elegible')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar excepción' }));

    const dialog = within(screen.getAllByRole('dialog')[1]);
    fireEvent.change(dialog.getByPlaceholderText(/700\.00/), { target: { value: '700' } });
    fireEvent.change(dialog.getByPlaceholderText(/FOLIO-123/), { target: { value: 'FOLIO-1' } });
    fireEvent.change(dialog.getByPlaceholderText(/vía telefónica/), { target: { value: 'Autorizado por dependencia.' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Registrar excepción' }));

    await waitFor(() => expect(mockedOverridePayerResolution).toHaveBeenCalledWith('order-1', {
      amount: '700', authorization_reference: 'FOLIO-1', reason: 'Autorizado por dependencia.',
    }));
  });
});
