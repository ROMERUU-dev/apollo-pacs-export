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
  if (path === '/orders') return { data: [] };

  const report = path.match(/^\/studies\/([^/]+)\/report$/);
  if (report) {
    if (method === 'POST') { const b = body as { content: string; status: string } | undefined; return { data: reportFor(report[1], b) }; }
    return { data: reportFor(report[1]) };
  }
  const shares = path.match(/^\/studies\/([^/]+)\/shares$/);
  if (shares) return { data: method === 'POST' ? { id: 'share-demo', study_id: shares[1], redeem_url: '/portal?token=demo', expires_at: iso(23, 59) } : [] };
  if (/^\/studies\/[^/]+\/viewer-launch$/.test(path)) return { data: { viewer_url: DEMO_VIEWER } };
  if (/^\/orders\/[^/]+\/status$/.test(path)) return { data: { id: 'ord-x', patient_id: 'p', accession_number: 'ACC', modality: 'US', status: 'in_progress', priority: 'routine' } };

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
