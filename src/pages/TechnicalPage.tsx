import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { operationsApi, type WorklistItem } from '../api/operations';
import { OperationalWorklistTable } from '../components/worklist';
import { StudiesWorkspace } from '../components/studies';
import { AddOnProcedureDialog } from '../components/addon';
import { useOperationalWorklist } from '../hooks/useOperationalWorklist';

export function TechnicalPage() {
  const worklist = useOperationalWorklist();
  const [selected, setSelected] = useState<WorklistItem>();
  const [mutationError, setMutationError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [showAddOn, setShowAddOn] = useState(false);
  const [query, setQuery] = useState('');
  const [modality, setModality] = useState('all');
  const modalities = useMemo(() => ['all', ...Array.from(new Set(worklist.items.map((item) => item.procedure.modality)))], [worklist.items]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return worklist.items.filter((item) => {
      if (modality !== 'all' && item.procedure.modality !== modality) return false;
      if (!q) return true;
      const haystack = `${item.patient.last_name} ${item.patient.first_name} ${item.patient.mrn} ${item.procedure.accession_number} ${item.procedure.description ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [worklist.items, query, modality]);
  useEffect(() => {
    if (!selected || !worklist.items.some((item) => item.order_id === selected.order_id)) setSelected(worklist.items[0]);
    else setSelected(worklist.items.find((item) => item.order_id === selected.order_id));
  }, [worklist.items, selected]);
  async function transition(status: 'in_progress' | 'completed') {
    if (!selected) return;
    setBusy(true); setMutationError(undefined);
    try { await operationsApi.updateOrderStatus(selected.order_id, status); await worklist.refresh(); }
    catch (error) { setMutationError(error instanceof Error ? error.message : 'No fue posible actualizar el estado.'); }
    finally { setBusy(false); }
  }
  return <div className="screen-page technical-page">
    <div className="view-label">OPERACIÓN CLÍNICA · HOY</div><div className="screen-heading"><div><h1 className="screen-title">Estación del técnico</h1><p>Worklist operativa compartida con Recepción.</p></div><button className="secondary-action" onClick={() => void worklist.refresh()}>Actualizar</button></div>
    <section className="module-shell tech-direct-layout"><div className="tech-list"><header><h2>Lista de trabajo</h2><p>{worklist.items.length} estudios programados o activos</p></header>
      <div className="worklist-toolbar">
        <div className="search-box"><Search size={15} aria-hidden="true" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, ID o accession" aria-label="Buscar en la worklist" /></div>
        <div className="worklist-filter-chips">{modalities.map((m) => <button key={m} type="button" className={modality === m ? 'active' : ''} aria-pressed={modality === m} onClick={() => setModality(m)}>{m === 'all' ? 'Todas' : m}</button>)}</div>
      </div>
      {worklist.error && <div className="inline-notice error">{worklist.error}</div>}<OperationalWorklistTable items={filtered} selectedId={selected?.order_id} onSelect={setSelected} />
      <div className="worklist-foot">Mostrando {filtered.length} de {worklist.items.length} estudios</div></div>
      <aside className="tech-detail"><div className="panel-kicker">ESTUDIO SELECCIONADO</div>{selected ? <><div className="detail-status"><i className={`status-pill ${selected.procedure.status}`}>● {selected.procedure.status}</i><i className={`priority-pill ${selected.procedure.priority ?? 'routine'}`}>{selected.procedure.priority ?? 'routine'}</i></div><h2>{selected.patient.last_name}, {selected.patient.first_name}</h2><p className="mono">PatientID {selected.patient.mrn} · Accession {selected.procedure.accession_number}</p><h3>Datos del procedimiento</h3><dl className="detail-list"><div><dt>Estudio</dt><dd>{selected.procedure.description ?? 'Estudio de imagen'}</dd></div><div><dt>Modalidad</dt><dd>{selected.procedure.modality}</dd></div><div><dt>Hora</dt><dd>{selected.procedure.scheduled_at ? new Date(selected.procedure.scheduled_at).toLocaleString('es-MX') : 'Sin hora'}</dd></div></dl>{selected.procedure.status === 'scheduled' && <button className="primary-action" disabled={busy} onClick={() => void transition('in_progress')}>Iniciar estudio</button>}{selected.procedure.status === 'in_progress' && <button className="primary-action success-action" disabled={busy} onClick={() => void transition('completed')}>Marcar como completado</button>}{selected.procedure.status === 'completed' && <div className="completion-banner">✓ Procedimiento completado</div>}{mutationError && <div className="inline-notice error">{mutationError}</div>}{selected.encounter_id && <button className="secondary-action addon-action" onClick={() => setShowAddOn(true)}>＋ Agregar estudio</button>}<small>Este panel actualiza la misma orden visible en Recepción. No inicia adquisición DICOM.</small></> : <div className="empty-detail">Selecciona un estudio de la lista.</div>}</aside>
    </section>
    <section className="archive-section"><div className="archive-heading"><div><div className="view-label">ARCHIVO DICOM</div><h2>Estudios recientes</h2></div><p>Consulta independiente de la worklist operativa.</p></div><StudiesWorkspace /></section>
    {showAddOn && selected?.encounter_id && <AddOnProcedureDialog
      encounterId={selected.encounter_id}
      patientLabel={`${selected.patient.last_name}, ${selected.patient.first_name}`}
      defaultSource="verbal_physician"
      onClose={() => setShowAddOn(false)}
      onCreated={async () => { await worklist.refresh(); }}
    />}
  </div>;
}
