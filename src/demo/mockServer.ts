/**
 * Frontend-only DEMO mode. When enabled it patches `window.fetch` so every
 * `/api/v1/*` call resolves against synthetic, PHI-free data — letting the whole
 * UI render with no backend. Dev/preview only; never a substitute for real data.
 *
 * Enable with `?demo=1` (persisted to localStorage) or `VITE_DEMO=1`.
 */

const API = '/api/v1';

function iso(h: number, m: number): string {
  const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString();
}

const SESSION = {
  username: 'dra.demo', subject: 'demo-user',
  roles: ['apollo-receptionist', 'apollo-technician', 'apollo-physician'],
};

const WORKLIST = [
  { order_id: 'ord-1', encounter_id: 'enc-1', patient: { mrn: 'BLK-1001', first_name: 'Mariana', last_name: 'Prueba' }, procedure: { accession_number: 'ACC-1001', modality: 'US', status: 'scheduled', priority: 'routine', description: 'US abdominal', scheduled_at: iso(9, 30) } },
  { order_id: 'ord-2', encounter_id: 'enc-2', patient: { mrn: 'BLK-1002', first_name: 'Jorge', last_name: 'Demo' }, procedure: { accession_number: 'ACC-1002', modality: 'MG', status: 'in_progress', priority: 'urgent', description: 'Mastografía bilateral', scheduled_at: iso(10, 0) } },
  { order_id: 'ord-3', encounter_id: 'enc-3', patient: { mrn: 'BLK-1003', first_name: 'Luisa', last_name: 'Ejemplo' }, procedure: { accession_number: 'ACC-1003', modality: 'DX', status: 'completed', priority: 'routine', description: 'Tórax PA', scheduled_at: iso(10, 30) } },
  { order_id: 'ord-4', patient: { mrn: 'BLK-1004', first_name: 'Pedro', last_name: 'Sintético' }, procedure: { accession_number: 'ACC-1004', modality: 'DX', status: 'scheduled', priority: 'stat', description: 'Rodilla AP y lateral', scheduled_at: iso(11, 0) } },
];

const STUDIES = [
  { id: 'st-1', study_instance_uid: '1.2.3.1', patient_id: 'p1', patient_name: 'Prueba, Mariana', medical_record_number: 'BLK-1001', accession_number: 'ACC-1001', description: 'US abdominal', performed_at: iso(9, 45), modality: 'US', status: 'completed', instance_count: 48, viewer_available: true },
  { id: 'st-2', study_instance_uid: '1.2.3.2', patient_id: 'p2', patient_name: 'Demo, Jorge', medical_record_number: 'BLK-1002', accession_number: 'ACC-1002', description: 'Mastografía bilateral', performed_at: iso(10, 20), modality: 'MG', status: 'completed', instance_count: 4, viewer_available: true },
  { id: 'st-3', study_instance_uid: '1.2.3.3', patient_id: 'p3', patient_name: 'Ejemplo, Luisa', medical_record_number: 'BLK-1003', accession_number: 'ACC-1003', description: 'Tórax PA', performed_at: iso(10, 50), modality: 'DX', status: 'completed', instance_count: 2, viewer_available: true },
];

const REPORT_SEED: Record<string, string> = {
  'st-1': '<p><b>HALLAZGOS:</b></p><p>Hígado de tamaño y ecogenicidad normales. Vía biliar no dilatada.</p><p><b>IMPRESIÓN:</b></p><p>Estudio dentro de límites normales.</p>',
};

const viewerHtml = '<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;background:#000;color:#9aa0a6;font:13px Inter,system-ui,sans-serif;display:grid;place-items:center}</style><div style="text-align:center"><div style="font-size:30px;color:#2f3845">&#9639;</div><div style="margin-top:8px">Visor OHIF &mdash; modo demo</div></div>';
const DEMO_VIEWER = 'data:text/html;charset=utf-8,' + encodeURIComponent(viewerHtml);

const HEALTH = { status: 'online', service: 'belstrel-api', version: 'demo', timestamp: new Date().toISOString() };
const PACS_HEALTH = { status: 'online', service: 'orthanc', version: 'demo', timestamp: new Date().toISOString() };

const PATIENTS = [
  { id: 'pat-1', mrn: 'BLK-1001', first_name: 'Mariana', last_name: 'Prueba', second_last_name: 'Demo', birth_date: '1986-04-12', sex: 'female', phone: '+52 638 100 0001' },
  { id: 'pat-2', mrn: 'BLK-1002', first_name: 'Jorge', last_name: 'Demo', birth_date: '1979-09-03', sex: 'male' },
  { id: 'pat-3', mrn: 'BLK-1003', first_name: 'Luisa', last_name: 'Ejemplo', birth_date: '1991-01-22', sex: 'female' },
];

const CATALOG = [
  { id: 'cat-1', code: 'US-ABD', name: 'Ultrasonido abdominal', modality: 'US', description: 'No requiere preparación previa', amount: '850.00', currency: 'MXN', is_active: true },
  { id: 'cat-2', code: 'MG-BIL', name: 'Mastografía bilateral', modality: 'MG', description: 'No usar desodorante el día del estudio', amount: '1200.00', currency: 'MXN', is_active: true },
  { id: 'cat-3', code: 'DX-TORAX', name: 'Radiografía de tórax', modality: 'DX', amount: '450.00', currency: 'MXN', is_active: true },
  { id: 'cat-4', code: 'DX-RODILLA', name: 'Rodilla AP y lateral', modality: 'DX', amount: '500.00', currency: 'MXN', is_active: true },
  { id: 'cat-5', code: 'US-TIR', name: 'Ultrasonido tiroideo', modality: 'US', amount: '700.00', currency: 'MXN', is_active: true },
  { id: 'cat-6', code: 'CT-ABD', name: 'Tomografía de abdomen', modality: 'CT', description: 'Ayuno de 6 horas', amount: '3500.00', currency: 'MXN', is_active: true },
];

const RATES = [{ id: 'rate-1', mxn_per_usd: '18.50', effective_at: iso(8, 0), created_by: 'dra.demo', is_active: true }];

const ORDERS = [
  { id: 'ord-1', patient_id: 'pat-1', accession_number: 'ACC-1001', modality: 'US', status: 'scheduled', priority: 'routine', description: 'US abdominal', scheduled_at: iso(9, 30), encounter_id: 'enc-1' },
  { id: 'ord-2', patient_id: 'pat-2', accession_number: 'ACC-1002', modality: 'MG', status: 'registered', priority: 'urgent', description: 'Mastografía bilateral' },
  { id: 'ord-3', patient_id: 'pat-3', accession_number: 'ACC-1003', modality: 'DX', status: 'completed', priority: 'routine', description: 'Tórax PA', scheduled_at: iso(10, 30), encounter_id: 'enc-3' },
];

const QUOTES = [
  { id: 'q-1', patient_id: 'pat-1', status: 'pending', total_mxn: '850.00', created_at: iso(9, 10), lines: [] },
  { id: 'q-2', patient_id: 'pat-2', status: 'pending', total_mxn: '1200.00', created_at: iso(9, 40), lines: [] },
];

const CASH_ACCESS = { unlocked: true, mode: 'development_bypass' };
const CASH_SESSIONS = [{ id: 'cash-1', status: 'open', opened_by: 'dra.demo', opened_at: iso(8, 0), opening_mxn: '2000.00', opening_usd: '100.00', physical_mxn: '2000.00', physical_usd: '100.00' }];
const CASH_MOVEMENTS = [{ id: 'mv-1', cash_session_id: 'cash-1', kind: 'in', currency: 'MXN', amount: '850.00', amount_mxn: '850.00', created_at: iso(9, 15) }];
const PAYMENTS = [{ id: 'pay-1', cash_session_id: 'cash-1', quote_id: 'q-1', total_received_mxn: '1000.00', applied_mxn: '850.00', change_mxn: '150.00', created_at: iso(9, 15), components: [] }];

const PAYERS = [
  { id: 'payer-1', code: 'SSA-SON', name: 'Secretaría de Salud de Sonora', is_active: true, created_at: iso(8, 0), updated_at: iso(8, 0) },
  { id: 'payer-2', code: 'ISSSTE', name: 'ISSSTE', is_active: true, created_at: iso(8, 0), updated_at: iso(8, 0) },
  { id: 'payer-3', code: 'IMSS-BX', name: 'IMSS Bienestar', is_active: true, created_at: iso(8, 0), updated_at: iso(8, 0) },
];
const PROCEDURE_DEFS = [
  { id: 'pd-1', code: 'US-ABD', name: 'Ultrasonido abdominal', modality: 'US', is_active: true },
  { id: 'pd-2', code: 'MG-BIL', name: 'Mastografía bilateral', modality: 'MG', is_active: true },
  { id: 'pd-3', code: 'DX-TORAX', name: 'Radiografía de tórax', modality: 'DX', is_active: true },
  { id: 'pd-4', code: 'CT-ABD', name: 'Tomografía de abdomen', modality: 'CT', is_active: true },
];
const RECEIVABLES = [
  { id: 'rcv-1', payer_id: 'payer-1', payer_pricing_resolution_id: 'res-1', order_id: 'ord-1', procedure_definition_id: 'US-ABD', encounter_id: 'enc-1', original_amount: '850.00', paid_amount: '0.00', outstanding_amount: '850.00', currency: 'MXN', status: 'submitted', service_date: iso(9, 30), created_by: 'dra.demo', created_at: iso(9, 30), updated_at: iso(9, 30) },
  { id: 'rcv-2', payer_id: 'payer-2', payer_pricing_resolution_id: 'res-2', order_id: 'ord-3', procedure_definition_id: 'DX-TORAX', encounter_id: 'enc-3', original_amount: '450.00', paid_amount: '450.00', outstanding_amount: '0.00', currency: 'MXN', status: 'paid', service_date: iso(10, 30), created_by: 'dra.demo', created_at: iso(10, 30), updated_at: iso(10, 30) },
  { id: 'rcv-3', payer_id: 'payer-1', payer_pricing_resolution_id: 'res-3', order_id: 'ord-2', procedure_definition_id: 'MG-BIL', encounter_id: 'enc-2', original_amount: '1200.00', paid_amount: '0.00', outstanding_amount: '1200.00', currency: 'MXN', status: 'accepted', service_date: iso(10, 0), created_by: 'dra.demo', created_at: iso(10, 0), updated_at: iso(10, 0) },
];
const RECEIVABLES_SUMMARY = { gross_expected: '2500.00', submitted: '850.00', accepted: '450.00', rejected: '0.00', disputed: '0.00', paid: '450.00', outstanding: '2050.00', count: 3 };

function reportFor(studyId: string, latest?: { content: string; status: string }) {
  const content = latest?.content ?? REPORT_SEED[studyId];
  const version = content
    ? { id: `${studyId}-v1`, version: 1, status: latest?.status ?? 'draft', content, author: 'dra.demo', finalized_at: latest?.status === 'final' ? new Date().toISOString() : undefined }
    : undefined;
  return { study_id: studyId, versions: version ? [version] : [], latest: version, final: version?.status === 'final' ? version : undefined };
}

function route(path: string, method: string, body: unknown): { data: unknown; headers?: Record<string, string> } | undefined {
  if (path === '/session') return { data: SESSION };
  if (path === '/health') return { data: HEALTH };
  if (path === '/pacs/health') return { data: PACS_HEALTH };
  if (path === '/operational-worklist') return { data: WORKLIST };
  if (path === '/studies') return { data: STUDIES, headers: { 'X-Total-Count': String(STUDIES.length) } };
  if (path === '/orders') return { data: method === 'POST' ? ORDERS[0] : ORDERS };
  if (path === '/patients') return { data: method === 'POST' ? PATIENTS[0] : PATIENTS };
  if (path === '/catalog-items') return { data: method === 'POST' ? CATALOG[0] : CATALOG };
  if (path === '/exchange-rates') return { data: method === 'POST' ? RATES[0] : RATES };
  if (path === '/quotes') return { data: method === 'POST' ? QUOTES[0] : QUOTES };
  if (path === '/cash/access') return { data: CASH_ACCESS };
  if (path === '/cash/sessions') return { data: method === 'POST' ? CASH_SESSIONS[0] : CASH_SESSIONS };
  if (path === '/cash/movements') return { data: method === 'POST' ? CASH_MOVEMENTS[0] : CASH_MOVEMENTS };
  if (path === '/cash/payments') return { data: method === 'POST' ? PAYMENTS[0] : PAYMENTS };
  if (path === '/payers') return { data: method === 'POST' || method === 'PUT' ? PAYERS[0] : PAYERS };
  if (/^\/payers\/[^/]+\/contracts$/.test(path)) return { data: [] };
  if (path === '/procedure-definitions') return { data: method === 'POST' ? PROCEDURE_DEFS[0] : PROCEDURE_DEFS };
  if (path === '/payer-receivables/summary') return { data: RECEIVABLES_SUMMARY };
  if (path === '/payer-receivables') return { data: RECEIVABLES };
  const rcv = path.match(/^\/payer-receivables\/([^/]+)$/);
  if (rcv) return { data: RECEIVABLES.find((r) => r.id === rcv[1]) ?? RECEIVABLES[0] };
  if (path === '/payer-remittances') return { data: [] };
  if (path === '/payer-submission-batches') return { data: [] };
  if (path === '/campaigns') return { data: [] };

  const report = path.match(/^\/studies\/([^/]+)\/report$/);
  if (report) {
    if (method === 'POST') { const b = body as { content: string; status: string } | undefined; return { data: reportFor(report[1], b) }; }
    return { data: reportFor(report[1]) };
  }
  const shares = path.match(/^\/studies\/([^/]+)\/shares$/);
  if (shares) return { data: method === 'POST' ? { id: 'share-demo', study_id: shares[1], redeem_url: '/portal?token=demo', expires_at: iso(23, 59) } : [] };
  if (/^\/studies\/[^/]+\/viewer-launch$/.test(path)) return { data: { viewer_url: DEMO_VIEWER } };
  if (/^\/orders\/[^/]+\/status$/.test(path)) return { data: { id: 'ord-x', patient_id: 'p', accession_number: 'ACC', modality: 'US', status: 'in_progress', priority: 'routine' } };
  const catDetail = path.match(/^\/catalog-items\/([^/]+)\/detail$/);
  if (catDetail) { const item = CATALOG.find((c) => c.id === catDetail[1]) ?? CATALOG[0]; return { data: { ...item, components: [] } }; }
  if (/^\/quotes\/[^/]+\/schedule$/.test(path)) return { data: [ORDERS[0]] };
  if (/^\/cash\/sessions\/[^/]+\/(open|close)$/.test(path)) return { data: CASH_SESSIONS[0] };
  if (/^\/cash\/sessions\/[^/]+\/pay$/.test(path)) return { data: PAYMENTS[0] };
  if (/^\/cash\/sessions\/[^/]+\/movements$/.test(path)) return { data: CASH_MOVEMENTS[0] };

  // Unmapped endpoints (catalog, receivables, payers...) — empty lists keep those
  // screens from crashing; they just render their empty states in demo mode.
  return { data: [] };
}

export function installDemoServer(): void {
  const w = window as unknown as { __belstrelDemo?: boolean };
  if (w.__belstrelDemo) return;
  w.__belstrelDemo = true;
  const realFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const marker = url.indexOf(API);
    if (marker === -1) return realFetch(input, init);
    const path = url.slice(marker + API.length).split('?')[0];
    let body: unknown;
    try { body = init?.body ? JSON.parse(init.body as string) : undefined; } catch { body = undefined; }
    const result = route(path, method, body);
    const payload = result?.data;
    return new Response(payload === undefined ? '' : JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...(result?.headers ?? {}) },
    });
  }) as typeof fetch;
  // eslint-disable-next-line no-console
  console.info('[Belstrel] modo demo activo — datos sintéticos, sin backend.');
}

export function demoEnabled(): boolean {
  try {
    const q = new URLSearchParams(location.search).get('demo');
    if (q === '1') { localStorage.setItem('belstrel-demo', '1'); return true; }
    if (q === '0') { localStorage.removeItem('belstrel-demo'); return false; }
    if (import.meta.env.VITE_DEMO === '1') return true;
    return localStorage.getItem('belstrel-demo') === '1';
  } catch {
    return import.meta.env.VITE_DEMO === '1';
  }
}
