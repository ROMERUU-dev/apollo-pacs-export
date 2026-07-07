import { useEffect, useState, type FormEvent } from 'react';
import { operationsApi, type Charge, type EncounterCoverage, type Order, type Patient, type PayerPricingResolution } from '../../api/operations';
import { ApplyAdjustmentDialog, CoverageDialog, OverridePayerResolutionDialog, ResolveFinancialReviewDialog } from '../billing';

const ADJUSTMENT_TYPE_LABELS: Record<string, string> = {
  percentage_discount: 'Descuento %', fixed_discount: 'Descuento fijo', courtesy: 'Cortesía', social_support: 'Apoyo social',
};

const ELIGIBILITY_LABELS: Record<string, string> = {
  eligible: '✓ Elegible', ineligible: '✕ No elegible', unconfigured: '? No configurado',
};

/** Cobertura de la visita + resolución de pagador para este procedimiento -- una realidad
 * deliberadamente separada del Charge comercial (Lote F2, docs/decisions/0026): nunca se
 * mezclan en la misma sección ni se resume como un solo estado. */
function PayerCoverageSection({ order, onNotice }: { order: Order; onNotice: (message: string) => Promise<void> }) {
  const [coverage, setCoverage] = useState<EncounterCoverage | null>();
  const [payerName, setPayerName] = useState('');
  const [resolution, setResolution] = useState<PayerPricingResolution | null>();
  const [showCoverage, setShowCoverage] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    if (!order.encounter_id) return Promise.resolve();
    const loads: Promise<unknown>[] = [
      operationsApi.encounterCoverage(order.encounter_id).then(async (value) => {
        setCoverage(value ?? null);
        if (value) {
          const payers = await operationsApi.payers();
          setPayerName(payers.find((p) => p.id === value.payer_id)?.name ?? value.payer_id);
        }
      }),
    ];
    if (order.procedure_definition_id) {
      loads.push(operationsApi.payerResolution(order.id).then((value) => setResolution(value ?? null)));
    }
    return Promise.all(loads).then(() => undefined).catch((requestError: Error) => setError(requestError.message));
  };

  useEffect(() => { void load(); }, [order.id]);

  if (!order.encounter_id) return null;

  return <div className="payer-coverage-section">
    <div className="panel-kicker">COBERTURA DE LA VISITA</div>
    {error && <div className="inline-notice error">{error}</div>}
    <div className="charge-row">
      <span>{coverage ? payerName : 'Particular'}</span>
      <button className="row-action" onClick={() => setShowCoverage(true)}>{coverage ? 'Cambiar' : 'Asignar cobertura'}</button>
    </div>
    {coverage && order.procedure_definition_id && resolution !== undefined && (
      <div className="payer-resolution-row">
        <span>{resolution ? ELIGIBILITY_LABELS[resolution.eligibility_status] : '? Sin resolución todavía'}</span>
        {resolution?.eligibility_status === 'eligible' && <b>Tarifa convenio: ${resolution.tariff_amount} {resolution.currency}</b>}
        {resolution?.eligibility_status !== 'eligible' && (
          <button className="row-action" onClick={() => setShowOverride(true)}>Autorizar excepción</button>
        )}
      </div>
    )}
    {showCoverage && (
      <CoverageDialog
        encounterId={order.encounter_id}
        current={coverage ?? undefined}
        onClose={() => setShowCoverage(false)}
        onSaved={async (message) => { await load(); await onNotice(message); }}
      />
    )}
    {showOverride && (
      <OverridePayerResolutionDialog
        order={order}
        onClose={() => setShowOverride(false)}
        onOverridden={async () => { await load(); await onNotice('Excepción autorizada registrada.'); }}
      />
    )}
  </div>;
}

function localDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value); const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function FinancialTab({ order, onNotice }: { order: Order; onNotice: (message: string) => Promise<void> }) {
  const [charge, setCharge] = useState<Charge>();
  const [loadError, setLoadError] = useState('');
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!order.encounter_id) return Promise.resolve();
    return operationsApi.charges(order.encounter_id)
      .then((charges) => setCharge(charges.find((c) => c.imaging_service_request_id === order.imaging_service_request_id)))
      .catch((requestError: Error) => setLoadError(requestError.message));
  };

  useEffect(() => { void load(); }, [order.id]);

  async function reverse(adjustmentId: string) {
    const reason = window.prompt('Motivo de la reversión:');
    if (!reason) return;
    setBusy(true);
    try {
      await operationsApi.reverseAdjustment(adjustmentId, reason);
      await load();
      await onNotice('Ajuste revertido.');
    } catch (requestError) {
      setLoadError(requestError instanceof Error ? requestError.message : 'No fue posible revertir el ajuste.');
    } finally { setBusy(false); }
  }

  if (order.financial_resolution_status === 'review_required') {
    return <div className="financial-tab">
      <PayerCoverageSection order={order} onNotice={onNotice} />
      <div className="inline-notice warning">Estado financiero: Pendiente de revisión</div>
      <p className="form-note">Este add-on aún no tiene un precio de referencia asignado. No se ha generado ningún cargo ni movimiento de caja.</p>
      <button className="primary-action" onClick={() => setShowResolve(true)}>Resolver</button>
      {showResolve && <ResolveFinancialReviewDialog order={order} onClose={() => setShowResolve(false)} onResolved={async () => { await load(); await onNotice('Revisión financiera resuelta.'); }} />}
    </div>;
  }

  if (loadError) return <div className="inline-notice error">{loadError}</div>;
  if (charge === undefined) return <div className="financial-tab"><PayerCoverageSection order={order} onNotice={onNotice} /><div className="dialog-state">Sin información financiera para esta orden.</div></div>;

  return <div className="financial-tab">
    <PayerCoverageSection order={order} onNotice={onNotice} />
    <div className="charge-breakdown">
      <div className="charge-row"><span>Precio base</span><b>${charge.base_amount} {charge.currency}</b></div>
      {charge.adjustments.filter((a) => a.is_active).map((adjustment) => <div className="charge-row adjustment-row" key={adjustment.id}>
        <span>{ADJUSTMENT_TYPE_LABELS[adjustment.type] ?? adjustment.type}{adjustment.percentage ? ` (${adjustment.percentage}%)` : ''}</span>
        <span>
          <b>-${adjustment.amount}</b>
          <button className="row-action" disabled={busy} onClick={() => void reverse(adjustment.id)}>Revertir</button>
        </span>
      </div>)}
      <div className="charge-row charge-total"><span>Total</span><b>${charge.net_amount} {charge.currency}</b></div>
    </div>
    <button className="secondary-action" onClick={() => setShowAdjustment(true)}>+ Aplicar ajuste</button>
    {showAdjustment && <ApplyAdjustmentDialog charge={charge} onClose={() => setShowAdjustment(false)} onApplied={async () => { await load(); await onNotice('Ajuste aplicado.'); }} />}
  </div>;
}

export function OrderManagementDialog({ order, patient, onClose, onSaved }: { order: Order; patient?: Patient; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [mode, setMode] = useState<'edit' | 'cancel' | 'financial'>('edit'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
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
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="apollo-dialog order-dialog" role="dialog" aria-modal="true" aria-labelledby="order-dialog-title"><header><div><span className="panel-kicker">GESTIÓN DE ORDEN</span><h2 id="order-dialog-title">{order.description ?? 'Estudio de imagen'}</h2><p>{patient ? `${patient.first_name} ${patient.last_name}` : 'Paciente'} · Accession {order.accession_number}</p></div><button className="icon-action" onClick={onClose} aria-label="Cerrar">×</button></header>{error && <div className="inline-notice error">{error}</div>}<nav className="dialog-tabs"><button className={mode === 'edit' ? 'active' : ''} disabled={!editable} onClick={() => setMode('edit')}>Editar / reprogramar</button><button className={mode === 'cancel' ? 'active danger' : ''} disabled={!cancellable} onClick={() => setMode('cancel')}>Cancelar / retirar WL</button><button className={mode === 'financial' ? 'active' : ''} onClick={() => setMode('financial')}>Financiero</button></nav>
    {mode === 'edit' && editable && <form className="patient-form" onSubmit={submitEdit}><div className="field-pair"><label>Estudio<input name="description" defaultValue={order.description ?? ''} /></label><label>Modalidad<input name="modality" required defaultValue={order.modality} /></label></div><div className="field-pair"><label>Fecha y hora<input name="scheduled_at" type="datetime-local" required defaultValue={localDateTime(order.scheduled_at)} /></label><label>Duración<select name="duration" defaultValue={order.scheduled_duration_minutes ?? 15}><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">60 minutos</option></select></label></div><div className="field-pair"><label>Prioridad<select name="priority" defaultValue={order.priority}><option value="routine">Normal</option><option value="urgent">Urgente</option><option value="stat">STAT</option></select></label><label>Sala / equipo<input name="station_name" defaultValue={order.scheduled_station_name ?? ''} /></label></div><label>AE Title del equipo (opcional)<input name="ae_title" defaultValue={order.scheduled_station_ae_title ?? ''} /></label><button className="primary-action" disabled={busy}>Guardar y sincronizar Worklist</button></form>}
    {mode === 'cancel' && cancellable && <form className="patient-form cancel-order-form" onSubmit={submitCancel}><div className="inline-notice warning">La orden se conservará como cancelada para auditoría, pero desaparecerá de la Worklist operativa.</div><label>Motivo de cancelación<textarea name="reason" required minLength={3} placeholder="Ej. El paciente se retiró antes del estudio" /></label><button className="danger-action" disabled={busy}>Confirmar cancelación</button></form>}
    {!editable && mode === 'edit' && <div className="dialog-state">Una orden en proceso, completada o cancelada ya no puede reprogramarse desde Recepción.</div>}
    {mode === 'financial' && <FinancialTab order={order} onNotice={async (message) => { await onSaved(message); }} />}
  </section></div>;
}
