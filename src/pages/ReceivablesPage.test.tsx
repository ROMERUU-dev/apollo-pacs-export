import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { operationsApi } from '../api/operations';
import { ReceivablesPage } from './ReceivablesPage';

vi.mock('../api/operations', () => ({
  operationsApi: {
    payers: vi.fn(),
    payerReceivables: vi.fn(),
    payerReceivable: vi.fn(),
    payerReceivablesSummary: vi.fn(),
    transitionReceivable: vi.fn(),
    submissionBatches: vi.fn(),
    submissionBatch: vi.fn(),
    createSubmissionBatch: vi.fn(),
    submissionLines: vi.fn(),
    addSubmissionLine: vi.fn(),
    submitBatch: vi.fn(),
    remittances: vi.fn(),
    remittanceSummary: vi.fn(),
    createRemittance: vi.fn(),
    createAllocation: vi.fn(),
    campaigns: vi.fn(),
    createCampaign: vi.fn(),
    updateCampaign: vi.fn(),
  },
}));

const mockedPayers = vi.mocked(operationsApi.payers);
const mockedReceivables = vi.mocked(operationsApi.payerReceivables);
const mockedSummary = vi.mocked(operationsApi.payerReceivablesSummary);
const mockedSubmissionBatches = vi.mocked(operationsApi.submissionBatches);
const mockedRemittances = vi.mocked(operationsApi.remittances);
const mockedCampaigns = vi.mocked(operationsApi.campaigns);
const mockedCreateCampaign = vi.mocked(operationsApi.createCampaign);

const PAYER = { id: 'payer-1', code: 'ISSSTESON', name: 'ISSSTESON', is_active: true, created_at: '', updated_at: '' };

const RECEIVABLE_DRAFT = {
  id: 'rec-1', payer_id: 'payer-1', payer_pricing_resolution_id: 'res-1', order_id: 'order-1',
  procedure_definition_id: 'pd-us-1', encounter_id: 'enc-1', original_amount: '750.00', paid_amount: '0.00',
  outstanding_amount: '750.00', currency: 'MXN' as const, status: 'draft' as const, service_date: '2026-07-06',
  created_by: 'test', created_at: '', updated_at: '',
};

const RECEIVABLE_PARTIAL = { ...RECEIVABLE_DRAFT, id: 'rec-2', status: 'partially_paid' as const, paid_amount: '400.00', outstanding_amount: '350.00' };
const RECEIVABLE_ACCEPTED = { ...RECEIVABLE_DRAFT, id: 'rec-3', status: 'accepted' as const };

const SUMMARY = { gross_expected: '750.00', submitted: '0.00', accepted: '0.00', rejected: '0.00', disputed: '0.00', paid: '0.00', outstanding: '750.00', count: 1 };

describe('ReceivablesPage (Lote F3)', () => {
  beforeEach(() => {
    mockedPayers.mockResolvedValue([PAYER]);
    mockedReceivables.mockResolvedValue([RECEIVABLE_DRAFT]);
    mockedSummary.mockResolvedValue(SUMMARY);
    mockedSubmissionBatches.mockResolvedValue([]);
    mockedRemittances.mockResolvedValue([]);
    mockedCampaigns.mockResolvedValue([]);
  });

  function receivablesTable() { return document.querySelector<HTMLElement>('.tariff-matrix')!; }

  it('muestra el dashboard resumen y la tabla de receivables', async () => {
    render(<ReceivablesPage />);
    await screen.findByText('Esperado');
    expect(within(receivablesTable()).getByText('Borrador')).toBeInTheDocument();
    expect(within(receivablesTable()).getAllByText('$750.00').length).toBeGreaterThan(0);
  });

  it('filtra por dependencia (payer)', async () => {
    render(<ReceivablesPage />);
    await screen.findByText('Esperado');
    fireEvent.change(screen.getByDisplayValue('Todas las dependencias'), { target: { value: 'payer-1' } });
    await waitFor(() => expect(mockedReceivables).toHaveBeenCalledWith(expect.objectContaining({ payer_id: 'payer-1' })));
  });

  it('filtra por estado', async () => {
    render(<ReceivablesPage />);
    await screen.findByText('Esperado');
    fireEvent.change(screen.getByDisplayValue('Todos los estados'), { target: { value: 'partially_paid' } });
    await waitFor(() => expect(mockedReceivables).toHaveBeenCalledWith(expect.objectContaining({ status_filter: 'partially_paid' })));
  });

  it('muestra estado "presentado" y "pago parcial" con pendiente correcto', async () => {
    mockedReceivables.mockResolvedValue([RECEIVABLE_PARTIAL]);
    render(<ReceivablesPage />);
    await screen.findByText('Esperado');
    expect(within(receivablesTable()).getByText('Pago parcial')).toBeInTheDocument();
    expect(within(receivablesTable()).getByText('$350.00')).toBeInTheDocument(); // outstanding
  });

  it('aceptado no implica pagado (accepted != paid)', async () => {
    mockedReceivables.mockResolvedValue([RECEIVABLE_ACCEPTED]);
    render(<ReceivablesPage />);
    await screen.findByText('Esperado');
    const row = within(receivablesTable()).getByText('Aceptado').closest<HTMLElement>('.tariff-matrix-row')!;
    // outstanding still equals original for an accepted-but-unpaid receivable
    expect(within(row).getAllByText('$750.00')).toHaveLength(2); // esperado + pendiente, cero pagado
  });

  it('abre el detalle de una cuenta por cobrar', async () => {
    render(<ReceivablesPage />);
    await screen.findByText('Esperado');
    fireEvent.click(within(receivablesTable()).getByRole('button', { name: 'Ver' }));
    expect(await screen.findByText('CUENTA POR COBRAR')).toBeInTheDocument();
  });

  it('crea un lote de presentación', async () => {
    const batch = { id: 'batch-1', payer_id: 'payer-1', batch_number: 'SUB-ISSSTESON-260707-0001', status: 'draft' as const, created_by: 'test', created_at: '' };
    vi.mocked(operationsApi.createSubmissionBatch).mockResolvedValue(batch);
    vi.mocked(operationsApi.submissionLines).mockResolvedValue([]);
    render(<ReceivablesPage />);
    fireEvent.change(await screen.findByDisplayValue('Todas las dependencias'), { target: { value: 'payer-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lotes de presentación' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo lote' }));
    await waitFor(() => expect(operationsApi.createSubmissionBatch).toHaveBeenCalledWith({ payer_id: 'payer-1' }));
    expect(await screen.findByText(/SUB-ISSSTESON/)).toBeInTheDocument();
  });

  it('presenta un lote existente', async () => {
    const batch = { id: 'batch-1', payer_id: 'payer-1', batch_number: 'SUB-ISSSTESON-260707-0001', status: 'draft' as const, created_by: 'test', created_at: '' };
    mockedSubmissionBatches.mockResolvedValue([batch]);
    vi.mocked(operationsApi.submissionLines).mockResolvedValue([{ id: 'line-1', batch_id: 'batch-1', receivable_id: 'rec-1', amount_submitted_snapshot: '750.00', created_by: 'test', created_at: '' }]);
    vi.mocked(operationsApi.payerReceivable).mockResolvedValue(RECEIVABLE_DRAFT);
    vi.mocked(operationsApi.submitBatch).mockResolvedValue({ ...batch, status: 'submitted' });
    vi.mocked(operationsApi.submissionBatch).mockResolvedValue({ ...batch, status: 'submitted' });
    render(<ReceivablesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Lotes de presentación' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ver' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Presentar lote' }));
    await waitFor(() => expect(operationsApi.submitBatch).toHaveBeenCalledWith('batch-1'));
  });

  it('registra un pago de dependencia (remittance)', async () => {
    const remittance = { id: 'rem-1', payer_id: 'payer-1', received_date: '2026-08-01', total_amount: '750.00', currency: 'MXN' as const, created_by: 'test', created_at: '' };
    vi.mocked(operationsApi.createRemittance).mockResolvedValue(remittance);
    vi.mocked(operationsApi.remittanceSummary).mockResolvedValue({ remittance, allocated_amount: '0.00', unallocated_amount: '750.00' });
    mockedReceivables.mockResolvedValue([RECEIVABLE_ACCEPTED]);
    vi.spyOn(window, 'prompt').mockReturnValue('750.00');
    render(<ReceivablesPage />);
    fireEvent.change(await screen.findByDisplayValue('Todas las dependencias'), { target: { value: 'payer-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pagos de dependencias' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Registrar pago' }));
    await waitFor(() => expect(operationsApi.createRemittance).toHaveBeenCalled());
    expect(await screen.findByText('Sin asignar')).toBeInTheDocument();
  });

  it('muestra el monto sin asignar de un remittance', async () => {
    const remittance = { id: 'rem-1', payer_id: 'payer-1', received_date: '2026-08-01', total_amount: '10000.00', currency: 'MXN' as const, created_by: 'test', created_at: '' };
    mockedRemittances.mockResolvedValue([remittance]);
    vi.mocked(operationsApi.remittanceSummary).mockResolvedValue({ remittance, allocated_amount: '1000.00', unallocated_amount: '9000.00' });
    mockedReceivables.mockResolvedValue([]);
    render(<ReceivablesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Pagos de dependencias' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Conciliar' }));
    expect(await screen.findByText('$9,000.00')).toBeInTheDocument();
  });

  it('lista y crea campañas', async () => {
    const campaign = { id: 'camp-1', code: 'MAMA2026', name: 'Campaña de Mama 2026', valid_from: '2026-01-01', is_active: true, created_at: '', updated_at: '' };
    mockedCreateCampaign.mockResolvedValue(campaign);
    vi.spyOn(window, 'prompt').mockReturnValueOnce('MAMA2026').mockReturnValueOnce('Campaña de Mama 2026');
    render(<ReceivablesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Campañas' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva campaña' }));
    await waitFor(() => expect(mockedCreateCampaign).toHaveBeenCalledWith(expect.objectContaining({ code: 'MAMA2026' })));
  });

  it('deja explícito que este ledger está separado de Caja, sin sugerir un cobro real al paciente', async () => {
    render(<ReceivablesPage />);
    await screen.findByText('Esperado');
    // The page explicitly clarifies the separation (a positive, correct statement) -- what must
    // NOT appear is any wording that implies this screen itself performs or represents a
    // patient cash collection ("Ingreso de caja", "Cobrado al paciente").
    expect(screen.queryByText(/ingreso de caja/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cobrado al paciente/i)).not.toBeInTheDocument();
    expect(screen.getByText(/separado de Caja/i)).toBeInTheDocument();
  });
});
