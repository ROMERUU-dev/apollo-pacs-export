import type { WorklistItem } from '../../api/operations';
import { continuesSameVisit } from '../../domain/worklist';

const STATUS_LABELS = { scheduled: 'Programado', in_progress: 'En proceso', completed: 'Completado', registered: 'Registrado', cancelled: 'Cancelado' } as const;

export function OperationalWorklistTable({ items, selectedId, onSelect }: {
  items: WorklistItem[];
  selectedId?: string;
  onSelect?: (item: WorklistItem) => void;
}) {
  return <div className="operational-table" role="table" aria-label="Worklist operativa">
    <div className="operational-row operational-head" role="row"><span>Paciente</span><span>Modalidad</span><span>Estudio</span><span>Hora</span><span>Prioridad</span><span>Estado</span></div>
    {items.map((item, index) => { const sameVisit = continuesSameVisit(items, index); return <button
      className={`operational-row ${selectedId === item.order_id ? 'selected' : ''} ${sameVisit ? 'same-visit' : ''}`}
      key={item.order_id}
      onClick={() => onSelect?.(item)}
      type="button"
      role="row"
    >
      <span>{sameVisit
        ? <small className="same-visit-marker">↳ misma visita</small>
        : <><b>{item.patient.last_name}, {item.patient.first_name}</b><small>PatientID {item.patient.mrn} · Accession {item.procedure.accession_number}</small></>}
      {sameVisit && <small>Accession {item.procedure.accession_number}</small>}</span>
      <span><i className="modality-chip">{item.procedure.modality}</i></span>
      <span>{item.procedure.description ?? 'Estudio de imagen'}</span>
      <span className="mono">{item.procedure.scheduled_at ? new Date(item.procedure.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
      <span><i className={`priority-pill ${item.procedure.priority ?? 'routine'}`}>{item.procedure.priority === 'stat' ? 'STAT' : item.procedure.priority === 'urgent' ? 'Urgente' : 'Normal'}</i></span>
      <span><i className={`status-pill ${item.procedure.status}`}>● {STATUS_LABELS[item.procedure.status]}</i></span>
    </button>; })}
    {!items.length && <div className="empty-table">No hay estudios programados para hoy.</div>}
  </div>;
}
