import { apiRequest } from './client';

export type Currency = 'MXN' | 'USD';
export interface Session { username: string; subject: string; roles: string[] }
export interface Patient { id: string; mrn: string; first_name: string; last_name: string; second_last_name?: string; middle_name?: string; birth_date: string; sex: string; phone?: string; email?: string }
export type OrderStatus = 'registered' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export interface Order { id: string; patient_id: string; accession_number: string; modality: string; status: OrderStatus; priority: 'routine' | 'urgent' | 'stat'; description?: string; scheduled_at?: string; scheduled_duration_minutes?: number; scheduled_station_ae_title?: string; scheduled_station_name?: string; quote_line_id?: string; encounter_id?: string; imaging_service_request_id?: string; procedure_definition_id?: string; financial_resolution_status?: string }
export interface CatalogItem { id: string; code: string; name: string; modality?: string; description?: string; amount: string; currency: Currency; is_active: boolean }
export interface ProcedureDefinition { id: string; code: string; name: string; modality: string; notes?: string; is_active: boolean }
export interface OfferingComponent { id: string; catalog_item_id: string; sequence: number; procedure_definition: ProcedureDefinition }
export interface CatalogItemDetail extends CatalogItem { components: OfferingComponent[] }
export type AddOnSource = 'direct_physician' | 'verbal_physician' | 'technician_protocol' | 'technician_complement' | 'reception_addition' | 'external_order' | 'other';
export interface AddOnProcedureRequest {
  procedure_definition_id: string;
  source?: AddOnSource;
  requested_by_physician?: string | null;
  reason?: string | null;
  scheduled_at?: string | null;
  scheduled_duration_minutes?: number;
}
export type AdjustmentType = 'percentage_discount' | 'fixed_discount' | 'courtesy' | 'social_support';
export interface AdjustmentCreateRequest {
  type: AdjustmentType;
  amount?: string | null;
  percentage?: string | null;
  reason?: string | null;
}
export interface Adjustment {
  id: string; charge_id: string; type: AdjustmentType; amount: string; percentage?: string; reason?: string;
  created_by: string; created_at: string; reversed_at?: string; reversed_by?: string; reversal_reason?: string; is_active: boolean;
}
export interface Charge {
  id: string; encounter_id: string; imaging_service_request_id: string; quote_line_id?: string; catalog_item_id?: string;
  code_snapshot: string; name_snapshot: string; base_amount: string; currency: Currency;
  created_by: string; created_at: string; adjustments: Adjustment[]; net_amount: string;
}
export interface FinancialReviewResolveRequest {
  catalog_item_id: string;
  adjustment?: AdjustmentCreateRequest | null;
}
export interface Payer { id: string; code: string; name: string; notes?: string; is_active: boolean; created_at: string; updated_at: string }
export interface PayerContract {
  id: string; payer_id: string; name: string; contract_number?: string;
  valid_from: string; valid_to?: string; is_active: boolean; notes?: string; created_at: string; updated_at: string;
}
export type TariffEligibility = 'eligible' | 'ineligible';
export interface PayerProcedureTariff {
  id: string; contract_id: string; procedure_definition_id: string; eligibility: TariffEligibility;
  tariff_amount?: string; currency?: Currency; external_code?: string; requires_authorization: boolean;
  valid_from: string; valid_to?: string; notes?: string; is_active: boolean; created_by: string; created_at: string; updated_at: string;
}
export interface ProcedureTariffMatrixRow {
  payer_id: string; payer_code: string; payer_name: string;
  contract_id?: string; contract_name?: string; tariff?: PayerProcedureTariff;
}
export interface EncounterCoverage {
  id: string; encounter_id: string; payer_id: string; contract_id?: string;
  member_reference?: string; authorization_number?: string; is_primary: boolean; is_active: boolean;
  created_by: string; created_at: string;
}
export type PayerEligibilityStatus = 'eligible' | 'ineligible' | 'unconfigured';
export type PayerResolutionSource = 'contract_tariff' | 'authorized_override';
export interface PayerPricingResolution {
  id: string; order_id: string; encounter_coverage_id?: string; payer_id: string; contract_id?: string;
  procedure_definition_id: string; tariff_id?: string; eligibility_status: PayerEligibilityStatus;
  tariff_amount?: string; currency?: Currency; external_code?: string; requires_authorization: boolean;
  authorization_reference?: string; resolution_source: PayerResolutionSource; reason?: string;
  resolved_by: string; resolved_at: string;
}
export interface PayerResolutionOverrideRequest {
  amount: string; currency?: Currency; authorization_reference: string; reason: string;
}
export type PayerReceivableStatus = 'draft' | 'submitted' | 'accepted' | 'rejected' | 'disputed' | 'partially_paid' | 'paid' | 'cancelled';
export interface PayerReceivable {
  id: string; payer_id: string; payer_contract_id?: string; encounter_coverage_id?: string;
  payer_pricing_resolution_id: string; order_id: string; procedure_definition_id: string; encounter_id: string;
  original_amount: string; paid_amount: string; outstanding_amount: string; currency: Currency;
  status: PayerReceivableStatus; service_date: string; external_code_snapshot?: string; authorization_reference_snapshot?: string;
  status_updated_at?: string; status_updated_by?: string; status_reason?: string;
  cancelled_at?: string; cancelled_by?: string; cancelled_reason?: string;
  created_by: string; created_at: string; updated_at: string;
}
export interface PayerReceivableSummary {
  gross_expected: string; submitted: string; accepted: string; rejected: string; disputed: string; paid: string; outstanding: string; count: number;
}
export type PayerSubmissionBatchStatus = 'draft' | 'submitted';
export interface PayerSubmissionBatch {
  id: string; payer_id: string; contract_id?: string; batch_number: string;
  period_from?: string; period_to?: string; status: PayerSubmissionBatchStatus;
  submitted_at?: string; submitted_by?: string; external_reference?: string; notes?: string;
  created_by: string; created_at: string;
}
export interface PayerSubmissionLine { id: string; batch_id: string; receivable_id: string; amount_submitted_snapshot: string; external_code_snapshot?: string; created_by: string; created_at: string }
export interface PayerRemittance {
  id: string; payer_id: string; contract_id?: string; received_date: string; total_amount: string; currency: Currency;
  external_reference?: string; payment_reference?: string; notes?: string; created_by: string; created_at: string;
}
export interface PayerRemittanceSummary { remittance: PayerRemittance; allocated_amount: string; unallocated_amount: string }
export interface PayerRemittanceAllocation {
  id: string; remittance_id: string; receivable_id: string; allocated_amount: string;
  reversed_at?: string; reversed_by?: string; reversal_reason?: string; created_by: string; created_at: string;
}
export interface Campaign { id: string; code: string; name: string; valid_from: string; valid_to?: string; is_active: boolean; notes?: string; created_at: string; updated_at: string }
export interface CampaignAttribution { id: string; campaign_id: string; order_id: string; attributed_by: string; attributed_at: string; notes?: string }
export interface CampaignSummary { campaign_id: string; procedures_attributed: number; encounters_involved: number; completed_count: number; modalities: Record<string, number> }
export interface ExchangeRate { id: string; mxn_per_usd: string; effective_at: string; created_by: string; is_active: boolean }
export interface QuoteLine { id: string; name_snapshot: string; quantity: string; currency: Currency; unit_amount: string; mxn_per_usd?: string; line_total_mxn: string }
export interface Quote { id: string; patient_id?: string; status: string; total_mxn: string; created_at: string; lines: QuoteLine[] }
export interface CashSession { id: string; status: string; opened_by: string; opened_at: string; opening_mxn: string; opening_usd: string; physical_mxn: string; physical_usd: string; expected_mxn?: string; expected_usd?: string; counted_mxn?: string; counted_usd?: string; difference_mxn?: string }
export interface PaymentComponent { method: 'cash' | 'card'; currency: Currency; amount: string; amount_mxn: string; mxn_per_usd?: string }
export interface Payment { id: string; cash_session_id: string; quote_id: string; total_received_mxn: string; applied_mxn: string; change_mxn: string; created_at: string; components: PaymentComponent[] }
export interface CashMovement { id: string; cash_session_id: string; payment_id?: string; kind: string; currency: Currency; amount: string; amount_mxn: string; created_at: string }
export interface CashAccess { unlocked: boolean; expires_at?: string; mode: 'oidc_reauthentication' | 'development_bypass' | 'locked' }
export interface TicketSettings { id: string; commercial_name: string; legal_name?: string; tax_id?: string; address?: string; phone?: string; header_text?: string; footer_text?: string; final_message?: string; show_logo: boolean; show_folio: boolean; show_patient: boolean; show_studies: boolean; show_line_prices: boolean; show_subtotal: boolean; show_total: boolean; show_currency: boolean; show_exchange_rate: boolean; show_payment_method: boolean; paper_width: '58mm' | '80mm' | 'letter'; updated_by?: string; updated_at: string }
export interface ReportVersion { id: string; version: number; status: string; content: string; content_html?: string; amendment_reason?: string; author: string; finalized_at?: string }
export interface Report { study_id: string; versions: ReportVersion[]; latest?: ReportVersion; final?: ReportVersion }
export interface Share { id: string; expires_at: string; revoked_at?: string; token?: string; redeem_url?: string }
export type DeliveryChannel = 'email' | 'whatsapp';
export interface DeliveryOptions { patient_id: string; email_masked?: string; phone_masked?: string; email_configured: boolean; whatsapp_configured: boolean; email_consented: boolean; whatsapp_consented: boolean; notice_version: string }
export interface StudyDelivery { id: string; study_id: string; share_id?: string; patient_id: string; channel: DeliveryChannel; provider: string; destination_masked: string; status: 'pending' | 'provider_accepted' | 'failed'; provider_message_id?: string; error_code?: string; requested_by: string; created_at: string; provider_accepted_at?: string }
export interface WorklistItem {
  order_id: string;
  encounter_id?: string;
  imaging_service_request_id?: string;
  patient: { mrn: string; first_name: string; last_name: string };
  procedure: { accession_number: string; modality: string; status: OrderStatus; priority?: 'routine' | 'urgent' | 'stat'; description?: string; scheduled_at?: string };
}

async function required<T>(path: string, init?: Parameters<typeof apiRequest<T>>[1]): Promise<T> {
  const value = await apiRequest<T>(path, init);
  if (value === undefined) throw new Error('Apollo devolvió una respuesta vacía.');
  return value;
}

export const operationsApi = {
  session: () => required<Session>('/session'),
  patients: (search?: string) => required<Patient[]>(`/patients?limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  createPatient: (value: object) => required<Patient>('/patients', { method: 'POST', json: value }),
  potentialDuplicates: (value: object) => required<Patient[]>('/patients/potential-duplicates', { method: 'POST', json: value }),
  orders: () => required<Order[]>('/orders?limit=100'),
  ordersByAccession: (accessionNumber: string) => required<Order[]>(`/orders?accession_number=${encodeURIComponent(accessionNumber)}`),
  createOrder: (value: object, idempotencyKey = crypto.randomUUID()) => required<Order>('/orders', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, json: value }),
  updateOrderSchedule: (orderId: string, value: object) => required<Order>(`/orders/${orderId}/schedule`, { method: 'PATCH', json: value }),
  cancelOrder: (orderId: string, reason: string) => required<Order>(`/orders/${orderId}/cancel`, { method: 'POST', json: { reason } }),
  addOnProcedure: (encounterId: string, value: AddOnProcedureRequest, idempotencyKey = crypto.randomUUID()) =>
    required<Order>(`/encounters/${encounterId}/add-on-procedures`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, json: value }),
  updateOrderStatus: (orderId: string, status: OrderStatus) => required<Order>(`/orders/${orderId}/status`, { method: 'PATCH', json: { status } }),
  worklist: () => required<WorklistItem[]>('/worklist'),
  operationalWorklist: (scheduledFrom: string, scheduledTo: string) => {
    const query = new URLSearchParams({ scheduled_from: scheduledFrom, scheduled_to: scheduledTo });
    return required<WorklistItem[]>(`/operational-worklist?${query}`);
  },
  catalog: (isActive?: boolean) => required<CatalogItem[]>(`/catalog-items${isActive === undefined ? '' : `?is_active=${isActive}`}`),
  createCatalog: (value: object) => required<CatalogItem>('/catalog-items', { method: 'POST', json: value }),
  updateCatalog: (itemId: string, value: object) => required<CatalogItem>(`/catalog-items/${itemId}`, { method: 'PUT', json: value }),
  catalogDetail: (itemId: string) => required<CatalogItemDetail>(`/catalog-items/${itemId}/detail`),
  procedureDefinitions: (isActive?: boolean) =>
    required<ProcedureDefinition[]>(`/procedure-definitions${isActive === undefined ? '' : `?is_active=${isActive}`}`),
  createProcedureDefinition: (value: { code: string; name: string; modality: string; notes?: string | null }) =>
    required<ProcedureDefinition>('/procedure-definitions', { method: 'POST', json: value }),
  updateProcedureDefinition: (definitionId: string, value: { code: string; name: string; modality: string; notes?: string | null; is_active: boolean }) =>
    required<ProcedureDefinition>(`/procedure-definitions/${definitionId}`, { method: 'PUT', json: value }),
  addCatalogComponent: (itemId: string, value: { procedure_definition_id: string; sequence: number }) =>
    required<OfferingComponent>(`/catalog-items/${itemId}/components`, { method: 'POST', json: value }),
  removeCatalogComponent: (itemId: string, componentId: string) =>
    apiRequest(`/catalog-items/${itemId}/components/${componentId}`, { method: 'DELETE' }),
  reorderCatalogComponent: (itemId: string, componentId: string, sequence: number) =>
    required<OfferingComponent>(`/catalog-items/${itemId}/components/${componentId}`, { method: 'PATCH', json: { sequence } }),
  charges: (encounterId?: string) => required<Charge[]>(`/charges${encounterId ? `?encounter_id=${encodeURIComponent(encounterId)}` : ''}`),
  charge: (chargeId: string) => required<Charge>(`/charges/${chargeId}`),
  createAdjustment: (chargeId: string, value: AdjustmentCreateRequest, idempotencyKey = crypto.randomUUID()) =>
    required<Adjustment>(`/charges/${chargeId}/adjustments`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, json: value }),
  reverseAdjustment: (adjustmentId: string, reason: string) =>
    required<Adjustment>(`/adjustments/${adjustmentId}/reverse`, { method: 'POST', json: { reason } }),
  resolveFinancialReview: (orderId: string, value: FinancialReviewResolveRequest, idempotencyKey = crypto.randomUUID()) =>
    required<Charge>(`/orders/${orderId}/resolve-financial-review`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, json: value }),
  payers: () => required<Payer[]>('/payers'),
  createPayer: (value: { code: string; name: string; notes?: string | null }) => required<Payer>('/payers', { method: 'POST', json: value }),
  updatePayer: (payerId: string, value: { code: string; name: string; notes?: string | null; is_active: boolean }) =>
    required<Payer>(`/payers/${payerId}`, { method: 'PUT', json: value }),
  payerContracts: (payerId: string) => required<PayerContract[]>(`/payers/${payerId}/contracts`),
  createPayerContract: (payerId: string, value: { name: string; contract_number?: string | null; valid_from: string; valid_to?: string | null }) =>
    required<PayerContract>(`/payers/${payerId}/contracts`, { method: 'POST', json: value }),
  updatePayerContract: (contractId: string, value: { name: string; contract_number?: string | null; valid_from: string; valid_to?: string | null; is_active: boolean }) =>
    required<PayerContract>(`/payer-contracts/${contractId}`, { method: 'PUT', json: value }),
  procedurePayerTariffs: (definitionId: string) => required<ProcedureTariffMatrixRow[]>(`/procedure-definitions/${definitionId}/payer-tariffs`),
  createPayerTariff: (
    contractId: string,
    value: { procedure_definition_id: string; eligibility: TariffEligibility; tariff_amount?: string | null; currency?: Currency; external_code?: string | null; requires_authorization?: boolean; valid_from: string; valid_to?: string | null },
    idempotencyKey = crypto.randomUUID(),
  ) => required<PayerProcedureTariff>(`/payer-contracts/${contractId}/tariffs`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, json: value }),
  updatePayerTariff: (tariffId: string, value: { procedure_definition_id: string; eligibility: TariffEligibility; tariff_amount?: string | null; currency?: Currency; external_code?: string | null; requires_authorization?: boolean; valid_from: string; valid_to?: string | null; is_active?: boolean }) =>
    required<PayerProcedureTariff>(`/payer-tariffs/${tariffId}`, { method: 'PUT', json: value }),
  encounterCoverage: (encounterId: string) => apiRequest<EncounterCoverage>(`/encounters/${encounterId}/coverage`),
  setEncounterCoverage: (encounterId: string, value: { payer_id: string; contract_id?: string | null; member_reference?: string | null; authorization_number?: string | null; is_primary?: boolean }) =>
    required<EncounterCoverage>(`/encounters/${encounterId}/coverage`, { method: 'PUT', json: value }),
  clearEncounterCoverage: (encounterId: string) => apiRequest(`/encounters/${encounterId}/coverage`, { method: 'DELETE' }),
  payerResolution: (orderId: string) => apiRequest<PayerPricingResolution>(`/orders/${orderId}/payer-resolution`),
  overridePayerResolution: (orderId: string, value: PayerResolutionOverrideRequest, idempotencyKey = crypto.randomUUID()) =>
    required<PayerPricingResolution>(`/orders/${orderId}/payer-resolution/override`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, json: value }),
  rates: () => required<ExchangeRate[]>('/exchange-rates'),
  createRate: (value: string) => required<ExchangeRate>('/exchange-rates', { method: 'POST', json: { mxn_per_usd: value } }),
  quotes: () => required<Quote[]>('/quotes'),
  createQuote: (catalogItemIds: string | string[], patientId?: string) => required<Quote>('/quotes', {
    method: 'POST', json: {
      patient_id: patientId || null,
      items: (Array.isArray(catalogItemIds) ? catalogItemIds : [catalogItemIds])
        .map((catalogItemId) => ({ catalog_item_id: catalogItemId, quantity: '1' })),
    },
  }),
  scheduleQuote: (quoteId: string, value: { mode: 'scheduled' | 'next_today'; scheduled_at?: string | null; slot_minutes: number; station_name?: string | null; station_ae_title?: string | null }) =>
    required<Order[]>(`/quotes/${quoteId}/schedule`, { method: 'POST', json: value }),
  cashAccess: () => required<CashAccess>('/cash/access'),
  unlockCash: () => required<CashAccess>('/cash/access', { method: 'POST' }),
  lockCash: () => apiRequest('/cash/access', { method: 'DELETE' }),
  cashSessions: () => required<CashSession[]>('/cash/sessions'),
  cashMovements: (cashSessionId?: string) => required<CashMovement[]>(`/cash/movements${cashSessionId ? `?cash_session_id=${encodeURIComponent(cashSessionId)}` : ''}`),
  payments: (cashSessionId?: string) => required<Payment[]>(`/cash/payments${cashSessionId ? `?cash_session_id=${encodeURIComponent(cashSessionId)}` : ''}`),
  createCashMovement: (cashSessionId: string, kind: 'deposit' | 'withdrawal', currency: Currency, amount: string) =>
    required<CashMovement>('/cash/movements', { method: 'POST', json: { cash_session_id: cashSessionId, kind, currency, amount } }),
  openCash: (mxn: string, usd: string) => required<CashSession>('/cash/sessions', {
    method: 'POST', json: { opening_mxn: mxn, opening_usd: usd },
  }),
  closeCash: (id: string, mxn: string, usd: string) => required<CashSession>(`/cash/sessions/${id}/close`, {
    method: 'POST', json: { counted_mxn: mxn, counted_usd: usd },
  }),
  pay: (cashSessionId: string, quoteId: string, amount: string, currency: Currency, method: 'cash' | 'card') =>
    required<Payment>('/cash/payments', { method: 'POST', json: {
      cash_session_id: cashSessionId, quote_id: quoteId, components: [{ amount, currency, method }],
    } }),
  payComponents: (cashSessionId: string, quoteId: string, components: Array<{ amount: string; currency: Currency; method: 'cash' | 'card' }>) =>
    required<Payment>('/cash/payments', { method: 'POST', json: { cash_session_id: cashSessionId, quote_id: quoteId, components } }),
  ticketSettings: () => required<TicketSettings>('/cash/ticket-settings'),
  saveTicketSettings: (value: Omit<TicketSettings, 'id' | 'updated_at' | 'updated_by'>) => required<TicketSettings>('/cash/ticket-settings', { method: 'PUT', json: value }),
  report: (studyId: string) => required<Report>(`/studies/${studyId}/report`),
  saveReport: (studyId: string, content: string, final: boolean, amendmentReason?: string, contentHtml?: string) => required<Report>(`/studies/${studyId}/report`, {
    method: 'POST', json: { content, content_html: contentHtml ?? null, status: final ? 'final' : 'draft', amendment_reason: amendmentReason || null },
  }),
  shares: (studyId: string) => required<Share[]>(`/studies/${studyId}/shares`),
  createShare: (studyId: string) => required<Share>(`/studies/${studyId}/shares`, { method: 'POST' }),
  revokeShare: (studyId: string, shareId: string) => apiRequest(`/studies/${studyId}/shares/${shareId}`, { method: 'DELETE' }),
  deliveryOptions: (studyId: string) => required<DeliveryOptions>(`/studies/${studyId}/delivery-options`),
  deliveries: (studyId: string) => required<StudyDelivery[]>(`/studies/${studyId}/deliveries`),
  deliverStudy: (studyId: string, channels: DeliveryChannel[], confirmConsent: boolean, noticeVersion: string) => required<StudyDelivery[]>(`/studies/${studyId}/deliveries`, {
    method: 'POST', json: { channels, confirm_consent: confirmConsent, notice_version: noticeVersion },
  }),
  revokeDeliveryConsent: (studyId: string, channel: DeliveryChannel) => apiRequest(`/studies/${studyId}/delivery-consent/${channel}`, { method: 'DELETE' }),
  redeem: <T>(token: string) => required<T>('/portal/redeem', { method: 'POST', json: { token } }),
  portalSession: <T>() => required<T>('/portal/session'),

  payerReceivables: (filters: { payer_id?: string; contract_id?: string; status_filter?: string; order_id?: string; encounter_id?: string } = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== undefined) as [string, string][]);
    return required<PayerReceivable[]>(`/payer-receivables${query.toString() ? `?${query}` : ''}`);
  },
  payerReceivable: (receivableId: string) => required<PayerReceivable>(`/payer-receivables/${receivableId}`),
  payerReceivablesSummary: (filters: { payer_id?: string; contract_id?: string; period_from?: string; period_to?: string } = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== undefined) as [string, string][]);
    return required<PayerReceivableSummary>(`/payer-receivables/summary${query.toString() ? `?${query}` : ''}`);
  },
  materializeReceivable: (orderId: string) => required<PayerReceivable>(`/orders/${orderId}/payer-receivable`, { method: 'POST' }),
  transitionReceivable: (receivableId: string, value: { status: PayerReceivableStatus; reason?: string | null; external_reference?: string | null }) =>
    required<PayerReceivable>(`/payer-receivables/${receivableId}/transition`, { method: 'POST', json: value }),

  submissionBatches: (payerId?: string, statusFilter?: string) => {
    const query = new URLSearchParams({ ...(payerId ? { payer_id: payerId } : {}), ...(statusFilter ? { status_filter: statusFilter } : {}) });
    return required<PayerSubmissionBatch[]>(`/payer-submission-batches${query.toString() ? `?${query}` : ''}`);
  },
  submissionBatch: (batchId: string) => required<PayerSubmissionBatch>(`/payer-submission-batches/${batchId}`),
  createSubmissionBatch: (value: { payer_id: string; contract_id?: string | null; period_from?: string | null; period_to?: string | null; external_reference?: string | null; notes?: string | null }, idempotencyKey = crypto.randomUUID()) =>
    required<PayerSubmissionBatch>('/payer-submission-batches', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, json: value }),
  submissionLines: (batchId: string) => required<PayerSubmissionLine[]>(`/payer-submission-batches/${batchId}/lines`),
  addSubmissionLine: (batchId: string, receivableId: string) =>
    required<PayerSubmissionLine>(`/payer-submission-batches/${batchId}/lines`, { method: 'POST', json: { receivable_id: receivableId } }),
  removeSubmissionLine: (batchId: string, receivableId: string) =>
    apiRequest(`/payer-submission-batches/${batchId}/lines/${receivableId}`, { method: 'DELETE' }),
  submitBatch: (batchId: string) => required<PayerSubmissionBatch>(`/payer-submission-batches/${batchId}/submit`, { method: 'POST' }),

  remittances: (payerId?: string) => required<PayerRemittance[]>(`/payer-remittances${payerId ? `?payer_id=${encodeURIComponent(payerId)}` : ''}`),
  remittanceSummary: (remittanceId: string) => required<PayerRemittanceSummary>(`/payer-remittances/${remittanceId}`),
  createRemittance: (value: { payer_id: string; contract_id?: string | null; received_date: string; total_amount: string; currency?: Currency; external_reference?: string | null; payment_reference?: string | null; notes?: string | null }, idempotencyKey = crypto.randomUUID()) =>
    required<PayerRemittance>('/payer-remittances', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, json: value }),
  remittanceAllocations: (remittanceId: string) => required<PayerRemittanceAllocation[]>(`/payer-remittances/${remittanceId}/allocations`),
  createAllocation: (remittanceId: string, value: { receivable_id: string; allocated_amount: string }, idempotencyKey = crypto.randomUUID()) =>
    required<PayerRemittanceAllocation>(`/payer-remittances/${remittanceId}/allocations`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, json: value }),
  reverseAllocation: (allocationId: string, reason: string) =>
    required<PayerRemittanceAllocation>(`/payer-remittance-allocations/${allocationId}/reverse`, { method: 'POST', json: { reason } }),

  campaigns: () => required<Campaign[]>('/campaigns'),
  createCampaign: (value: { code: string; name: string; valid_from: string; valid_to?: string | null; notes?: string | null }) =>
    required<Campaign>('/campaigns', { method: 'POST', json: value }),
  updateCampaign: (campaignId: string, value: { code: string; name: string; valid_from: string; valid_to?: string | null; notes?: string | null; is_active: boolean }) =>
    required<Campaign>(`/campaigns/${campaignId}`, { method: 'PUT', json: value }),
  campaignAttributions: (orderId: string) => required<CampaignAttribution[]>(`/orders/${orderId}/campaign-attributions`),
  createCampaignAttribution: (orderId: string, campaignId: string) =>
    required<CampaignAttribution>(`/orders/${orderId}/campaign-attributions`, { method: 'POST', json: { campaign_id: campaignId } }),
  removeCampaignAttribution: (attributionId: string) => apiRequest(`/campaign-attributions/${attributionId}`, { method: 'DELETE' }),
  campaignSummary: (campaignId: string) => required<CampaignSummary>(`/campaigns/${campaignId}/summary`),
};
