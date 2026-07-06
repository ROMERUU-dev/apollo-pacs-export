import { useState, type FormEvent } from 'react';
import { operationsApi, type Order, type Patient } from '../../api/operations';

function localDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value); const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function OrderManagementDialog({ order, patient, onClose, onSaved }: { order: Order; patient?: Patient; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [mode, setMode] = useState<'edit' | 'cancel'>('edit'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError('');
    try {
      await operationsApi.updateOrderSchedule(order.id, {
        modality: data.get('modality'), description: data.get('description') || null,
        priority: data.get('priority'), scheduled_at: new Date(String(data.get('scheduled_at'))).toISOString(),
        scheduled_duration_minutes: Number(data.get('duration')), scheduled_station_name: data.get('station_name') || null,
        scheduled_station_ae_title: data.get('ae_title') || null,
      });
      await onSaved('Orden actualizada y Worklist sincronizada.'); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible actualizar la orden.'); } finally { setBusy(false); }
  }
  async function submitCancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const reason = String(new FormData(event.currentTarget).get('reason') ?? '').trim(); setBusy(true); setError('');
    try { await operationsApi.cancelOrder(order.id, reason); await onSaved('Orden cancelada y retirada de Worklist.'); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No fue posible cancelar la orden.'); } finally { setBusy(false); }
  }
  const editable = order.status === 'registered' || order.status === 'scheduled'; const cancellable = !['completed', 'cancelled'].includes(order.status);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="apollo-dialog order-dialog" role="dialog" aria-modal="true" aria-labelledby="order-dialog-title"><header><div><span className="panel-kicker">GESTIÓN DE ORDEN</span><h2 id="order-dialog-title">{order.description ?? 'Estudio de imagen'}</h2><p>{patient ? `${patient.first_name} ${patient.last_name}` : 'Paciente'} · Accession {order.accession_number}</p></div><button className="icon-action" onClick={onClose} aria-label="Cerrar">×</button></header>{error && <div className="inline-notice error">{error}</div>}<nav className="dialog-tabs"><button className={mode === 'edit' ? 'active' : ''} disabled={!editable} onClick={() => setMode('edit')}>Editar / reprogramar</button><button className={mode === 'cancel' ? 'active danger' : ''} disabled={!cancellable} onClick={() => setMode('cancel')}>Cancelar / retirar WL</button></nav>
    {mode === 'edit' && editable && <form className="patient-form" onSubmit={submitEdit}><div className="field-pair"><label>Estudio<input name="description" defaultValue={order.description ?? ''} /></label><label>Modalidad<input name="modality" required defaultValue={order.modality} /></label></div><div className="field-pair"><label>Fecha y hora<input name="scheduled_at" type="datetime-local" required defaultValue={localDateTime(order.scheduled_at)} /></label><label>Duración<select name="duration" defaultValue={order.scheduled_duration_minutes ?? 15}><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">60 minutos</option></select></label></div><div className="field-pair"><label>Prioridad<select name="priority" defaultValue={order.priority}><option value="routine">Normal</option><option value="urgent">Urgente</option><option value="stat">STAT</option></select></label><label>Sala / equipo<input name="station_name" defaultValue={order.scheduled_station_name ?? ''} /></label></div><label>AE Title del equipo (opcional)<input name="ae_title" defaultValue={order.scheduled_station_ae_title ?? ''} /></label><button className="primary-action" disabled={busy}>Guardar y sincronizar Worklist</button></form>}
    {mode === 'cancel' && cancellable && <form className="patient-form cancel-order-form" onSubmit={submitCancel}><div className="inline-notice warning">La orden se conservará como cancelada para auditoría, pero desaparecerá de la Worklist operativa.</div><label>Motivo de cancelación<textarea name="reason" required minLength={3} placeholder="Ej. El paciente se retiró antes del estudio" /></label><button className="danger-action" disabled={busy}>Confirmar cancelación</button></form>}
    {!editable && mode === 'edit' && <div className="dialog-state">Una orden en proceso, completada o cancelada ya no puede reprogramarse desde Recepción.</div>}
  </section></div>;
}
