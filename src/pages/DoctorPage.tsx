import { useEffect, useRef, useState } from 'react';
import { FileText, Eye, Mic, Sparkles } from 'lucide-react';
import { getStudies, launchStudyViewer, safeViewerUrl, type StudySummary } from '../api/studies';
import { operationsApi, type Order, type Report, type Share } from '../api/operations';
import { StudyDeliveryDialog } from '../components/studies';
import { AddOnProcedureDialog } from '../components/addon';
import { RichReportEditor, REPORT_TEMPLATES, DEFAULT_REPORT_HTML, htmlToPlainText } from '../components/reporter';
import { useViewerMessages, type ViewerMessage } from '../hooks/useViewerMessages';

const REPORTER_PANEL_KEY = 'medicalReporterPanelCollapsed';

function readCollapsed(key: string): boolean {
  try { return localStorage.getItem(key) === 'true'; } catch { return false; }
}

function writeCollapsed(key: string, value: boolean): void {
  try { localStorage.setItem(key, String(value)); } catch { /* private mode / quota exceeded: collapse still works, just isn't remembered */ }
}

export function DoctorPage() {
  const [studies, setStudies] = useState<StudySummary[]>([]); const [selected, setSelected] = useState<StudySummary>(); const [report, setReport] = useState<Report>();
  const [content, setContent] = useState(DEFAULT_REPORT_HTML); const [seed, setSeed] = useState(0); const [reason, setReason] = useState(''); const [shares, setShares] = useState<Share[]>([]); const [newLink, setNewLink] = useState<string>(); const [error, setError] = useState<string>();
  const [showDelivery, setShowDelivery] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order>();
  const [showAddOn, setShowAddOn] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [reporterCollapsed, setReporterCollapsed] = useState(() => readCollapsed(REPORTER_PANEL_KEY));
  const [notice, setNotice] = useState<string>();
  const templatesRef = useRef<HTMLDivElement>(null);
  const viewerWindowRef = useRef<Window | null>(null);
  useEffect(() => { getStudies({ page: 1, pageSize: 100 }).then((r) => { setStudies(r.items); if (r.items[0]) void select(r.items[0]); }).catch((e: Error) => setError(e.message)); }, []);
  useEffect(() => { window.dispatchEvent(new Event('resize')); }, [reporterCollapsed]);
  useEffect(() => {
    if (!showTemplates) return;
    const onClick = (e: MouseEvent) => { if (!templatesRef.current?.contains(e.target as Node)) setShowTemplates(false); };
    document.addEventListener('mousedown', onClick); return () => document.removeEventListener('mousedown', onClick);
  }, [showTemplates]);
  function toggleReporter() { setReporterCollapsed((value) => { const next = !value; writeCollapsed(REPORTER_PANEL_KEY, next); return next; }); }
  function expandReporter() { setReporterCollapsed(false); writeCollapsed(REPORTER_PANEL_KEY, false); }
  async function select(study: StudySummary) {
    setSelected(study); setNewLink(undefined); setSelectedOrder(undefined); setPreview(false);
    try {
      const [r, s] = await Promise.all([operationsApi.report(study.id), operationsApi.shares(study.id)]);
      setReport(r); setContent(r.latest?.content_html ?? r.latest?.content ?? DEFAULT_REPORT_HTML); setSeed((n) => n + 1); setShares(s);
    } catch (e) { setError((e as Error).message); }
    if (study.accessionNumber) {
      try { const [order] = await operationsApi.ordersByAccession(study.accessionNumber); if (order?.encounter_id) setSelectedOrder(order); }
      catch { /* the add-on action simply stays hidden if the order/encounter can't be resolved */ }
    }
  }
  // Open the real apollo-full viewer in its own tab. We open the blank tab synchronously (inside the
  // click gesture, so the popup blocker allows it) and point it at the viewer URL once it resolves.
  // The tab keeps window.opener = this workspace, so the viewer's "+ Reporte"/"Cerrar" post back here.
  function openViewer(study: StudySummary) {
    const win = window.open('', '_blank');
    if (!win) { setError('No se pudo abrir el visor; permite las ventanas emergentes para este sitio.'); return; }
    viewerWindowRef.current = win;
    launchStudyViewer(study.id)
      .then((value) => {
        const url = safeViewerUrl(value.viewerUrl);
        if (!url) throw new Error('Apollo devolvió una URL de visor no segura.');
        // Carry the backend study id so the viewer's report panel can load/save this study's report.
        const sep = url.includes('?') ? '&' : '?';
        win.location.href = `${url}${sep}apolloStudyId=${encodeURIComponent(study.id)}`;
      })
      .catch((e) => { win.close(); setError((e as Error).message); });
  }
  function openStudy(study: StudySummary) {
    setNotice(undefined);
    void select(study); // always load the report, even for studies without viewable images
    if (!study.viewerAvailable) { setNotice('Este estudio no tiene imágenes disponibles para el visor.'); return; }
    openViewer(study);
  }
  function applyTemplate(html: string) { setContent(html); setSeed((n) => n + 1); setShowTemplates(false); }
  async function save(final: boolean) { if (!selected) return; try { const value = await operationsApi.saveReport(selected.id, htmlToPlainText(content), final, reason, content); setReport(value); setReason(''); } catch (e) { setError((e as Error).message); } }
  async function share() { if (!selected) return; try { const value = await operationsApi.createShare(selected.id); setShares(await operationsApi.shares(selected.id)); setNewLink(`${location.origin}${value.redeem_url}`); } catch (e) { setError((e as Error).message); } }
  async function revoke(id: string) { if (!selected) return; await operationsApi.revokeShare(selected.id, id); setShares(await operationsApi.shares(selected.id)); }
  // The viewer tab posts back which study it is on: open its reporter, or refetch if it isn't loaded.
  async function handleViewerMessage(message: ViewerMessage) {
    if (message.type === 'apollo:close-study') { viewerWindowRef.current = null; window.focus(); return; }
    setNotice(undefined);
    const uid = message.studyInstanceUID;
    const loaded = studies.find((study) => study.studyInstanceUid === uid);
    if (loaded) { expandReporter(); window.focus(); await select(loaded); return; }
    try {
      const result = await getStudies({ page: 1, pageSize: 100 });
      setStudies(result.items);
      const match = result.items.find((study) => study.studyInstanceUid === uid);
      if (match) { expandReporter(); window.focus(); await select(match); }
      else setNotice('No encontramos el estudio solicitado por el visor en los pendientes.');
    } catch (e) { setError((e as Error).message); }
  }
  useViewerMessages((message) => void handleViewerMessage(message));
  const templates = selected ? [...REPORT_TEMPLATES].sort((a, b) => Number(b.modality === selected.modality) - Number(a.modality === selected.modality)) : REPORT_TEMPLATES;
  return <div className="screen-page doctor-page"><div className="view-label">LECTURA CLÍNICA</div><div className="screen-heading"><div><h1 className="screen-title">Lectura del radiólogo</h1><p>Elige un estudio para abrirlo en el visor y redacta el informe aquí.</p></div></div><section className={`module-shell doctor-layout ${reporterCollapsed ? 'reporter-collapsed' : ''}`}>
    <aside className="reading-queue">
      <header><h2>Pendientes</h2></header>
      <div className="filter-chips"><button>Modalidad⌄</button><button>Estado⌄</button><button>Prioridad⌄</button></div>
      {studies.map((study) => <button className={`reading-card ${selected?.id === study.id ? 'selected' : ''}`} key={study.id} onClick={() => openStudy(study)} title="Abrir en el visor">
        <span><i className="modality-chip">{study.modality}</i>{study.status === 'error' && <i className="urgent-chip">Urgente</i>}{study.viewerAvailable && <i className="reading-card__open" aria-hidden="true">Abrir ↗</i>}</span>
        <strong>{study.description}</strong>
        <small>{study.patientName}{study.accessionNumber ? ` · Accession ${study.accessionNumber}` : ''}</small>
      </button>)}
    </aside>
    <aside className="report-panel">
      <button type="button" className="panel-collapse-toggle" aria-expanded={!reporterCollapsed} aria-controls="report-panel-content" aria-label={reporterCollapsed ? 'Expandir reporte' : 'Colapsar reporte'} onClick={toggleReporter}>{reporterCollapsed ? '‹' : '›'}</button>
      {!reporterCollapsed && <div id="report-panel-content" className="report-panel-content"><div className="panel-kicker">REPORTE</div>{selected ? <>
        <div className="report-study">
          <strong>{selected.patientName}</strong>
          <dl><div><dt>Estudio</dt><dd>{selected.modality} · {selected.description}</dd></div><div><dt>Accession</dt><dd>{selected.accessionNumber ?? 'No disponible'}</dd></div><div><dt>Estatus</dt><dd>{report?.final ? 'Firmado' : 'En interpretación'}</dd></div></dl>
        </div>
        <div className="report-toolbar"><div className="template-menu" ref={templatesRef}><button type="button" className="template-trigger" aria-haspopup="menu" aria-expanded={showTemplates} onClick={() => setShowTemplates((v) => !v)}><FileText size={14} aria-hidden="true" /> Plantilla</button>{showTemplates && <div className="template-list" role="menu">{templates.map((t) => <button key={t.id} type="button" role="menuitem" onClick={() => applyTemplate(t.html)}>{t.name}{t.modality && <small>{t.modality}</small>}</button>)}</div>}</div><button type="button" className={`preview-toggle ${preview ? 'active' : ''}`} aria-pressed={preview} onClick={() => setPreview((v) => !v)}><Eye size={14} aria-hidden="true" /> Vista previa</button></div>
        <RichReportEditor html={content} initKey={String(seed)} readOnly={preview} onChange={setContent} />
        {report?.final && !preview && <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo de la enmienda" />}
        <div className="report-dictation"><button type="button" disabled title="Próximamente"><Mic size={14} aria-hidden="true" /> Dictar</button><button type="button" disabled title="Próximamente" className="ai-assist"><Sparkles size={14} aria-hidden="true" /> IA</button></div>
        <div className="report-actions"><button className="secondary-action" onClick={() => void save(false)}>Guardar borrador</button><button className="primary-action" onClick={() => void save(true)}>Firmar</button></div>
        {selectedOrder?.encounter_id && <button className="secondary-action addon-action" onClick={() => setShowAddOn(true)}>＋ Agregar estudio</button>}<button className="primary-action delivery-action" onClick={() => setShowDelivery(true)}>Enviar por correo / WhatsApp</button><button className="share-action" onClick={() => void share()}>Crear enlace manual</button>{newLink && <output className="share-link">{newLink}</output>}<ul className="share-list">{shares.filter((s) => !s.revoked_at).map((s) => <li key={s.id}>Vence {new Date(s.expires_at).toLocaleDateString('es-MX')} <button onClick={() => void revoke(s.id)}>Revocar</button></li>)}</ul></> : <div className="empty-detail">Selecciona un estudio de la lista</div>}</div>}
    </aside>
  {notice && <div className="inline-notice doctor-error">{notice}</div>}{error && <div className="inline-notice error doctor-error">{error}</div>}</section>{showDelivery && selected && <StudyDeliveryDialog studyId={selected.id} studyLabel={`${selected.patientName} · ${selected.description}`} onClose={() => setShowDelivery(false)} />}
  {showAddOn && selectedOrder?.encounter_id && <AddOnProcedureDialog
    encounterId={selectedOrder.encounter_id}
    patientLabel={selected?.patientName ?? 'Paciente'}
    defaultSource="direct_physician"
    onClose={() => setShowAddOn(false)}
    onCreated={async () => { /* the new add-on shows up in Worklist/Reception; nothing to refresh here */ }}
  />}</div>;
}
