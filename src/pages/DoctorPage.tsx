import { useEffect, useRef, useState } from 'react';
import {
  LayoutGrid, Move, ChevronsUpDown, ZoomIn, RotateCw, RotateCcw,
  Ruler, Triangle, Circle, Pencil, Play,
  FileText, Eye, ExternalLink, Mic, Sparkles, X,
} from 'lucide-react';
import { getStudies, launchStudyViewer, type StudySummary } from '../api/studies';
import { operationsApi, type Order, type Report, type Share } from '../api/operations';
import { StudyDeliveryDialog } from '../components/studies';
import { AddOnProcedureDialog } from '../components/addon';
import { RichReportEditor, REPORT_TEMPLATES, DEFAULT_REPORT_HTML } from '../components/reporter';

const PATIENTS_PANEL_KEY = 'medicalPatientsPanelCollapsed';
const REPORTER_PANEL_KEY = 'medicalReporterPanelCollapsed';

const VIEWER_TOOLS = [
  { id: 'layout', label: 'Disposición', Icon: LayoutGrid },
  { id: 'move', label: 'Mover', Icon: Move },
  { id: 'scroll', label: 'Scroll', Icon: ChevronsUpDown },
  { id: 'zoom', label: 'Zoom', Icon: ZoomIn },
  { id: 'rotate', label: 'Girar', Icon: RotateCw },
  { id: 'reset', label: 'Restaurar', Icon: RotateCcw },
  { id: 'measure', label: 'Medir', Icon: Ruler },
  { id: 'angle', label: 'Ángulos', Icon: Triangle },
  { id: 'roi', label: 'ROI', Icon: Circle },
  { id: 'annotate', label: 'Anotar', Icon: Pencil },
  { id: 'cine', label: 'Cine', Icon: Play },
] as const;

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
  const [viewerUrl, setViewerUrl] = useState<string>();
  const [activeTool, setActiveTool] = useState<string>('move');
  const [preview, setPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [patientsCollapsed, setPatientsCollapsed] = useState(() => readCollapsed(PATIENTS_PANEL_KEY));
  const [reporterCollapsed, setReporterCollapsed] = useState(() => readCollapsed(REPORTER_PANEL_KEY));
  const templatesRef = useRef<HTMLDivElement>(null);
  useEffect(() => { getStudies({ page: 1, pageSize: 100 }).then((r) => { setStudies(r.items); if (r.items[0]) void select(r.items[0]); }).catch((e: Error) => setError(e.message)); }, []);
  useEffect(() => { window.dispatchEvent(new Event('resize')); }, [patientsCollapsed, reporterCollapsed]);
  useEffect(() => {
    if (!showTemplates) return;
    const onClick = (e: MouseEvent) => { if (!templatesRef.current?.contains(e.target as Node)) setShowTemplates(false); };
    document.addEventListener('mousedown', onClick); return () => document.removeEventListener('mousedown', onClick);
  }, [showTemplates]);
  function togglePatients() { setPatientsCollapsed((value) => { const next = !value; writeCollapsed(PATIENTS_PANEL_KEY, next); return next; }); }
  function toggleReporter() { setReporterCollapsed((value) => { const next = !value; writeCollapsed(REPORTER_PANEL_KEY, next); return next; }); }
  async function select(study: StudySummary) {
    setSelected(study); setNewLink(undefined); setSelectedOrder(undefined); setViewerUrl(undefined); setPreview(false);
    try {
      const [r, s] = await Promise.all([operationsApi.report(study.id), operationsApi.shares(study.id)]);
      setReport(r); setContent(r.latest?.content ?? DEFAULT_REPORT_HTML); setSeed((n) => n + 1); setShares(s);
    } catch (e) { setError((e as Error).message); }
    if (study.accessionNumber) {
      try { const [order] = await operationsApi.ordersByAccession(study.accessionNumber); if (order?.encounter_id) setSelectedOrder(order); }
      catch { /* the add-on action simply stays hidden if the order/encounter can't be resolved */ }
    }
  }
  function applyTemplate(html: string) { setContent(html); setSeed((n) => n + 1); setShowTemplates(false); }
  async function save(final: boolean) { if (!selected) return; try { const value = await operationsApi.saveReport(selected.id, content, final, reason); setReport(value); setReason(''); } catch (e) { setError((e as Error).message); } }
  async function share() { if (!selected) return; try { const value = await operationsApi.createShare(selected.id); setShares(await operationsApi.shares(selected.id)); setNewLink(`${location.origin}${value.redeem_url}`); } catch (e) { setError((e as Error).message); } }
  async function revoke(id: string) { if (!selected) return; await operationsApi.revokeShare(selected.id, id); setShares(await operationsApi.shares(selected.id)); }
  async function loadViewer() { if (!selected) return; try { const value = await launchStudyViewer(selected.id); setViewerUrl(value.viewerUrl); } catch (e) { setError((e as Error).message); } }
  async function openViewerTab() { if (!selected) return; try { const url = viewerUrl ?? (await launchStudyViewer(selected.id)).viewerUrl; window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) { setError((e as Error).message); } }
  const templates = selected ? [...REPORT_TEMPLATES].sort((a, b) => Number(b.modality === selected.modality) - Number(a.modality === selected.modality)) : REPORT_TEMPLATES;
  return <div className="screen-page doctor-page"><div className="view-label">LECTURA CLÍNICA</div><div className="screen-heading"><div><h1 className="screen-title">Lectura del radiólogo</h1><p>Pendientes, visor e informe en un solo workspace.</p></div></div><section className={`module-shell doctor-layout ${patientsCollapsed ? 'patients-collapsed' : ''} ${reporterCollapsed ? 'reporter-collapsed' : ''}`}>
    <aside className="reading-queue">
      <button type="button" className="panel-collapse-toggle" aria-expanded={!patientsCollapsed} aria-controls="reading-queue-content" aria-label={patientsCollapsed ? 'Expandir lista de pacientes' : 'Colapsar lista de pacientes'} onClick={togglePatients}>{patientsCollapsed ? '›' : '‹'}</button>
      {!patientsCollapsed && <div id="reading-queue-content" className="reading-queue-content"><header><h2>Pendientes</h2></header><div className="filter-chips"><button>Modalidad⌄</button><button>Estado⌄</button><button>Prioridad⌄</button></div>{studies.map((study) => <button className={`reading-card ${selected?.id === study.id ? 'selected' : ''}`} key={study.id} onClick={() => void select(study)}><span><i className="modality-chip">{study.modality}</i>{study.status === 'error' && <i className="urgent-chip">Urgente</i>}</span><strong>{study.description}</strong><small>{study.patientName}{study.accessionNumber ? ` · Accession ${study.accessionNumber}` : ''}</small></button>)}</div>}
    </aside>
    <section className="viewer-stage">
      <div className="viewer-tools">{VIEWER_TOOLS.map(({ id, label, Icon }) => <button key={id} type="button" className={activeTool === id ? 'active' : ''} aria-pressed={activeTool === id} title={label} onClick={() => setActiveTool(id)}><Icon size={17} aria-hidden="true" /><small>{label}</small></button>)}</div>
      <div className="dicom-canvas">{selected ? (viewerUrl ? <>
        <div className="viewer-embed-bar"><span>{selected.patientName} · {selected.description}</span><span className="viewer-embed-actions"><button type="button" className="icon-ghost" title="Abrir en pestaña nueva" onClick={() => window.open(viewerUrl, '_blank', 'noopener,noreferrer')}><ExternalLink size={15} aria-hidden="true" /></button><button type="button" className="icon-ghost" title="Cerrar visor" onClick={() => setViewerUrl(undefined)}><X size={15} aria-hidden="true" /></button></span></div>
        <iframe className="viewer-frame" src={viewerUrl} title={`Visor OHIF · ${selected.description}`} />
      </> : <>
        <div className="dicom-meta">{selected.patientName}<br />PatientID {selected.medicalRecordNumber}<br />Accession {selected.accessionNumber ?? 'no disponible'}<br />{selected.description}</div>
        <div className="image-placeholder"><span>▧</span><p>Visor DICOM conectado mediante OHIF</p><div className="viewer-launch-actions"><button className="primary-action" onClick={() => void loadViewer()}>Cargar visor aquí</button><button className="secondary-action" onClick={() => void openViewerTab()}>Abrir en pestaña</button></div></div>
        <div className="dicom-scale">Zoom 100% · WL 40 / 400<br />──── 5 cm</div>
      </>) : <div className="image-placeholder">Selecciona un estudio</div>}</div>
    </section>
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
        {selectedOrder?.encounter_id && <button className="secondary-action addon-action" onClick={() => setShowAddOn(true)}>＋ Agregar estudio</button>}<button className="primary-action delivery-action" onClick={() => setShowDelivery(true)}>Enviar por correo / WhatsApp</button><button className="share-action" onClick={() => void share()}>Crear enlace manual</button>{newLink && <output className="share-link">{newLink}</output>}<ul className="share-list">{shares.filter((s) => !s.revoked_at).map((s) => <li key={s.id}>Vence {new Date(s.expires_at).toLocaleDateString('es-MX')} <button onClick={() => void revoke(s.id)}>Revocar</button></li>)}</ul></> : <div className="empty-detail">Sin estudio seleccionado</div>}</div>}
    </aside>
  {error && <div className="inline-notice error doctor-error">{error}</div>}</section>{showDelivery && selected && <StudyDeliveryDialog studyId={selected.id} studyLabel={`${selected.patientName} · ${selected.description}`} onClose={() => setShowDelivery(false)} />}
  {showAddOn && selectedOrder?.encounter_id && <AddOnProcedureDialog
    encounterId={selectedOrder.encounter_id}
    patientLabel={selected?.patientName ?? 'Paciente'}
    defaultSource="direct_physician"
    onClose={() => setShowAddOn(false)}
    onCreated={async () => { /* the new add-on shows up in Worklist/Reception; nothing to refresh here */ }}
  />}</div>;
}
