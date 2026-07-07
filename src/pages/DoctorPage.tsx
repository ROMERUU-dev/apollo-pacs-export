import { useEffect, useState } from 'react';
import { getStudies, launchStudyViewer, type StudySummary } from '../api/studies';
import { operationsApi, type Order, type Report, type Share } from '../api/operations';
import { StudyDeliveryDialog } from '../components/studies';
import { AddOnProcedureDialog } from '../components/addon';

const PATIENTS_PANEL_KEY = 'medicalPatientsPanelCollapsed';
const REPORTER_PANEL_KEY = 'medicalReporterPanelCollapsed';

function readCollapsed(key: string): boolean {
  try { return localStorage.getItem(key) === 'true'; } catch { return false; }
}

function writeCollapsed(key: string, value: boolean): void {
  try { localStorage.setItem(key, String(value)); } catch { /* private mode / quota exceeded: collapse still works, just isn't remembered */ }
}

export function DoctorPage() {
  const [studies, setStudies] = useState<StudySummary[]>([]); const [selected, setSelected] = useState<StudySummary>(); const [report, setReport] = useState<Report>();
  const [content, setContent] = useState(''); const [reason, setReason] = useState(''); const [shares, setShares] = useState<Share[]>([]); const [newLink, setNewLink] = useState<string>(); const [error, setError] = useState<string>();
  const [showDelivery, setShowDelivery] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order>();
  const [showAddOn, setShowAddOn] = useState(false);
  const [patientsCollapsed, setPatientsCollapsed] = useState(() => readCollapsed(PATIENTS_PANEL_KEY));
  const [reporterCollapsed, setReporterCollapsed] = useState(() => readCollapsed(REPORTER_PANEL_KEY));
  useEffect(() => { getStudies({ page: 1, pageSize: 100 }).then((r) => { setStudies(r.items); if (r.items[0]) void select(r.items[0]); }).catch((e: Error) => setError(e.message)); }, []);
  useEffect(() => { window.dispatchEvent(new Event('resize')); }, [patientsCollapsed, reporterCollapsed]);
  function togglePatients() { setPatientsCollapsed((value) => { const next = !value; writeCollapsed(PATIENTS_PANEL_KEY, next); return next; }); }
  function toggleReporter() { setReporterCollapsed((value) => { const next = !value; writeCollapsed(REPORTER_PANEL_KEY, next); return next; }); }
  async function select(study: StudySummary) {
    setSelected(study); setNewLink(undefined); setSelectedOrder(undefined);
    try { const [r, s] = await Promise.all([operationsApi.report(study.id), operationsApi.shares(study.id)]); setReport(r); setContent(r.latest?.content ?? 'HALLAZGOS:\n\nIMPRESIÓN:\n'); setShares(s); } catch (e) { setError((e as Error).message); }
    if (study.accessionNumber) {
      try { const [order] = await operationsApi.ordersByAccession(study.accessionNumber); if (order?.encounter_id) setSelectedOrder(order); }
      catch { /* the add-on action simply stays hidden if the order/encounter can't be resolved */ }
    }
  }
  async function save(final: boolean) { if (!selected) return; try { const value = await operationsApi.saveReport(selected.id, content, final, reason); setReport(value); setReason(''); } catch (e) { setError((e as Error).message); } }
  async function share() { if (!selected) return; try { const value = await operationsApi.createShare(selected.id); setShares(await operationsApi.shares(selected.id)); setNewLink(`${location.origin}${value.redeem_url}`); } catch (e) { setError((e as Error).message); } }
  async function revoke(id: string) { if (!selected) return; await operationsApi.revokeShare(selected.id, id); setShares(await operationsApi.shares(selected.id)); }
  async function openViewer() { if (!selected) return; try { const value = await launchStudyViewer(selected.id); window.open(value.viewerUrl, '_blank', 'noopener,noreferrer'); } catch (e) { setError((e as Error).message); } }
  return <div className="screen-page doctor-page"><div className="view-label">LECTURA CLÍNICA</div><div className="screen-heading"><div><h1 className="screen-title">Lectura del radiólogo</h1><p>Pendientes, visor e informe en un solo workspace.</p></div></div><section className={`module-shell doctor-layout ${patientsCollapsed ? 'patients-collapsed' : ''} ${reporterCollapsed ? 'reporter-collapsed' : ''}`}>
    <aside className="reading-queue">
      <button type="button" className="panel-collapse-toggle" aria-expanded={!patientsCollapsed} aria-controls="reading-queue-content" aria-label={patientsCollapsed ? 'Expandir lista de pacientes' : 'Colapsar lista de pacientes'} onClick={togglePatients}>{patientsCollapsed ? '›' : '‹'}</button>
      {!patientsCollapsed && <div id="reading-queue-content" className="reading-queue-content"><header><h2>Pendientes</h2></header><div className="filter-chips"><button>Modalidad⌄</button><button>Estado⌄</button><button>Prioridad⌄</button></div>{studies.map((study) => <button className={`reading-card ${selected?.id === study.id ? 'selected' : ''}`} key={study.id} onClick={() => void select(study)}><span><i className="modality-chip">{study.modality}</i>{study.status === 'error' && <i className="urgent-chip">Urgente</i>}</span><strong>{study.description}</strong><small>{study.patientName}{study.accessionNumber ? ` · Accession ${study.accessionNumber}` : ''}</small></button>)}</div>}
    </aside>
    <section className="viewer-stage"><div className="viewer-tools"><button>▦<small>1x1</small></button><button className="active">✣<small>Mover</small></button><button>▯<small>Scroll</small></button><button>⌕<small>Zoom</small></button><button>◐<small>Ventana</small></button><button>⌁<small>Medir</small></button><button>↻<small>Reset</small></button></div><div className="dicom-canvas">{selected ? <><div className="dicom-meta">{selected.patientName}<br />PatientID {selected.medicalRecordNumber}<br />Accession {selected.accessionNumber ?? 'no disponible'}<br />{selected.description}</div><div className="image-placeholder"><span>▧</span><p>Visor DICOM conectado mediante OHIF</p><button onClick={() => void openViewer()}>Abrir imágenes</button></div><div className="dicom-scale">Zoom 100% · WL 40 / 400<br />──── 5 cm</div></> : <div className="image-placeholder">Selecciona un estudio</div>}</div></section>
    <aside className="report-panel">
      <button type="button" className="panel-collapse-toggle" aria-expanded={!reporterCollapsed} aria-controls="report-panel-content" aria-label={reporterCollapsed ? 'Expandir reporte' : 'Colapsar reporte'} onClick={toggleReporter}>{reporterCollapsed ? '‹' : '›'}</button>
      {!reporterCollapsed && <div id="report-panel-content" className="report-panel-content"><div className="panel-kicker">REPORTE</div>{selected ? <><div className="report-tabs"><button className="active">{selected.modality} simple</button></div><textarea value={content} onChange={(e) => setContent(e.target.value)} />{report?.final && <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo de la enmienda" />}<div className="report-actions"><button className="primary-action" onClick={() => void save(false)}>Guardar borrador</button><button className="secondary-action" onClick={() => void save(true)}>Finalizar</button></div>{selectedOrder?.encounter_id && <button className="secondary-action addon-action" onClick={() => setShowAddOn(true)}>＋ Agregar estudio</button>}<button className="primary-action delivery-action" onClick={() => setShowDelivery(true)}>Enviar por correo / WhatsApp</button><button className="share-action" onClick={() => void share()}>Crear enlace manual</button>{newLink && <output className="share-link">{newLink}</output>}<ul className="share-list">{shares.filter((s) => !s.revoked_at).map((s) => <li key={s.id}>Vence {new Date(s.expires_at).toLocaleDateString('es-MX')} <button onClick={() => void revoke(s.id)}>Revocar</button></li>)}</ul></> : <div className="empty-detail">Sin estudio seleccionado</div>}</div>}
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
