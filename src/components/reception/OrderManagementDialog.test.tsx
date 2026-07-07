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
  },
}));

const mockedCharges = vi.mocked(operationsApi.charges);
const mockedCreateAdjustment = vi.mocked(operationsApi.createAdjustment);
const mockedResolveFinancialReview = vi.mocked(operationsApi.resolveFinancialReview);
const mockedCatalog = vi.mocked(operationsApi.catalog);

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
