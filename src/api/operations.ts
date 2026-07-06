import { apiRequest } from './client';

export type Currency = 'MXN' | 'USD';
export interface Session { username: string; subject: string; roles: string[] }
export interface Patient { id: string; mrn: string; first_name: string; last_name: string; second_last_name?: string; middle_name?: string; birth_date: string; sex: string; phone?: string; email?: string }
export type OrderStatus = 'registered' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export interface Order { id: string; patient_id: string; accession_number: string; modality: string; status: OrderStatus; priority: 'routine' | 'urgent' | 'stat'; description?: string; scheduled_at?: string; scheduled_duration_minutes?: number; scheduled_station_ae_title?: string; scheduled_station_name?: string; quote_line_id?: string; encounter_id?: string; imaging_service_request_id?: string; procedure_definition_id?: string; financial_resolution_status?: string }
export interface CatalogItem { id: string; code: string; name: string; modality?: string; description?: string; amount: string; currency: Currency; is_active: boolean }
export interface ProcedureDefinition { id: string; code: string; name: string; modality: string; is_active: boolean }
export interface OfferingComponent { id: string; catalog_item_id: string; sequence: number; procedure_definition: ProcedureDefinition }
export interface CatalogItemDetail extends CatalogItem { components: OfferingComponent[] }
export type AddOnSource = 'direct_physician' | 'verbal_physician' | 'technician_protocol' | 'technician_complement' | 'reception_addition' | 'external_order' | 'other';
export interface AddOnProcedureRequest {
  procedure_definition_id: string;
  source: AddOnSource;
  requested_by_physician?: string | null;
  reason?: string | null;
  scheduled_at?: string | null;
  scheduled_duration_minutes?: number;
}
export interface ExchangeRate { id: string; mxn_per_usd: string; effective_at: string; created_by: string; is_active: boolean }
export interface QuoteLine { id: string; name_snapshot: string; quantity: string; currency: Currency; unit_amount: string; mxn_per_usd?: string; line_total_mxn: string }
export interface Quote { id: string; patient_id?: string; status: string; total_mxn: string; created_at: string; lines: QuoteLine[] }
export interface CashSession { id: string; status: string; opened_by: string; opened_at: string; opening_mxn: string; opening_usd: string; physical_mxn: string; physical_usd: string; expected_mxn?: string; expected_usd?: string; counted_mxn?: string; counted_usd?: string; difference_mxn?: string }
export interface PaymentComponent { method: 'cash' | 'card'; currency: Currency; amount: string; amount_mxn: string; mxn_per_usd?: string }
export interface Payment { id: string; cash_session_id: string; quote_id: string; total_received_mxn: string; applied_mxn: string; change_mxn: string; created_at: string; components: PaymentComponent[] }
export interface CashMovement { id: string; cash_session_id: string; payment_id?: string; kind: string; currency: Currency; amount: string; amount_mxn: string; created_at: string }
export interface CashAccess { unlocked: boolean; expires_at?: string; mode: 'oidc_reauthentication' | 'development_bypass' | 'locked' }
export interface TicketSettings { id: string; commercial_name: string; legal_name?: string; tax_id?: string; address?: string; phone?: string; header_text?: string; footer_text?: string; final_message?: string; show_logo: boolean; show_folio: boolean; show_patient: boolean; show_studies: boolean; show_line_prices: boolean; show_subtotal: boolean; show_total: boolean; show_currency: boolean; show_exchange_rate: boolean; show_payment_method: boolean; paper_width: '58mm' | '80mm' | 'letter'; updated_by?: string; updated_at: string }
export interface ReportVersion { id: string; version: number; status: string; content: string; amendment_reason?: string; author: string; finalized_at?: string }
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
  catalog: () => required<CatalogItem[]>('/catalog-items'),
  createCatalog: (value: object) => required<CatalogItem>('/catalog-items', { method: 'POST', json: value }),
  catalogDetail: (itemId: string) => required<CatalogItemDetail>(`/catalog-items/${itemId}/detail`),
  procedureDefinitions: () => required<ProcedureDefinition[]>('/procedure-definitions'),
  createProcedureDefinition: (value: { code: string; name: string; modality: string }) =>
    required<ProcedureDefinition>('/procedure-definitions', { method: 'POST', json: value }),
  addCatalogComponent: (itemId: string, value: { procedure_definition_id: string; sequence: number }) =>
    required<OfferingComponent>(`/catalog-items/${itemId}/components`, { method: 'POST', json: value }),
  removeCatalogComponent: (itemId: string, componentId: string) =>
    apiRequest(`/catalog-items/${itemId}/components/${componentId}`, { method: 'DELETE' }),
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
  saveReport: (studyId: string, content: string, final: boolean, amendmentReason?: string) => required<Report>(`/studies/${studyId}/report`, {
    method: 'POST', json: { content, status: final ? 'final' : 'draft', amendment_reason: amendmentReason || null },
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
};
