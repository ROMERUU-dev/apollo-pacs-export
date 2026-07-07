import { useEffect, useState } from 'react';
import {
  operationsApi, type Campaign, type Payer, type PayerContract, type PayerReceivable, type PayerReceivableSummary,
  type PayerRemittance, type PayerRemittanceSummary, type PayerSubmissionBatch,
} from '../api/operations';

type Tab = 'receivables' | 'batches' | 'remittances' | 'campaigns';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'receivables', label: 'Cuentas por cobrar' },
  { id: 'batches', label: 'Lotes de presentación' },
  { id: 'remittances', label: 'Pagos de dependencias' },
  { id: 'campaigns', label: 'Campañas' },
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', submitted: 'Presentado', accepted: 'Aceptado', rejected: 'Rechazado',
  disputed: 'En disputa', partially_paid: 'Pago parcial', paid: 'Pagado', cancelled: 'Cancelado',
};

function money(value: string) { return `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`; }

function SummaryDashboard({ payerId }: { payerId: string }) {
  const [summary, setSummary] = useState<PayerReceivableSummary>();
  useEffect(() => { void operationsApi.payerReceivablesSummary({ payer_id: payerId || undefined }).then(setSummary); }, [payerId]);
  if (!summary) return null;
  return <div className="receivable-summary-grid">
    <div className="receivable-summary-card"><span>Esperado</span><b>{money(summary.gross_expected)}</b></div>
    <div className="receivable-summary-card"><span>Presentado</span><b>{money(summary.submitted)}</b></div>
    <div className="receivable-summary-card"><span>Pagado</span><b>{money(summary.paid)}</b></div>
    <div className="receivable-summary-card"><span>Pendiente</span><b>{money(summary.outstanding)}</b></div>
  </div>;
}

function ReceivableDetail({ receivable, onClose }: { receivable: PayerReceivable; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="apollo-dialog" role="dialog" aria-modal="true" aria-labelledby="receivable-detail-title">
      <header>
        <div><span className="panel-kicker">CUENTA POR COBRAR</span><h2 id="receivable-detail-title">{money(receivable.original_amount)} {receivable.currency}</h2></div>
        <button className="icon-action" aria-label="Cerrar" onClick={onClose}>×</button>
      </header>
      <div className="charge-breakdown">
        <div className="charge-row"><span>Estado</span><b>{STATUS_LABELS[receivable.status] ?? receivable.status}</b></div>
        <div className="charge-row"><span>Fecha de servicio</span><b>{receivable.service_date}</b></div>
        <div className="charge-row"><span>Tarifa snapshot</span><b>{money(receivable.original_amount)} {receivable.currency}</b></div>
        <div className="charge-row"><span>Pagado</span><b>{money(receivable.paid_amount)}</b></div>
        <div className="charge-row charge-total"><span>Pendiente</span><b>{money(receivable.outstanding_amount)}</b></div>
      </div>
      {receivable.status_reason && <p className="form-note">Motivo del último cambio: {receivable.status_reason}</p>}
    </section>
  </div>;
}

function ReceivablesTab({ payerId, onNotice }: { payerId: string; onNotice: (message: string) => Promise<void> }) {
  const [receivables, setReceivables] = useState<PayerReceivable[]>();
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState<PayerReceivable>();
  const load = () => operationsApi.payerReceivables({ payer_id: payerId || undefined, status_filter: statusFilter || undefined }).then(setReceivables);
  useEffect(() => { void load(); }, [payerId, statusFilter]);

  async function doTransition(receivable: PayerReceivable, status: string) {
    const reason = status === 'rejected' || status === 'disputed' ? window.prompt('Motivo:') ?? undefined : undefined;
    try {
      await operationsApi.transitionReceivable(receivable.id, { status: status as never, reason });
      await load();
      await onNotice('Estado de la cuenta por cobrar actualizado.');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible cambiar el estado.');
    }
  }

  return <div className="settings-tab-content">
    <SummaryDashboard payerId={payerId} />
    <div className="module-toolbar">
      <h2>Receivables</h2>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
        <option value="">Todos los estados</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>
    <div className="tariff-matrix">
      <div className="tariff-matrix-row tariff-matrix-head"><span>Procedimiento</span><span>Fecha</span><span>Esperado</span><span>Pagado</span><span>Pendiente</span><span>Estado</span><span /></div>
      {receivables?.map((receivable) => <div className="tariff-matrix-row" key={receivable.id}>
        <span>{receivable.procedure_definition_id.slice(0, 8)}</span>
        <span>{receivable.service_date}</span>
        <span>{money(receivable.original_amount)}</span>
        <span>{money(receivable.paid_amount)}</span>
        <span>{money(receivable.outstanding_amount)}</span>
        <span>{STATUS_LABELS[receivable.status] ?? receivable.status}</span>
        <span className="component-row-actions">
          <button className="row-action" onClick={() => setDetail(receivable)}>Ver</button>
          {receivable.status === 'submitted' && <button className="row-action" onClick={() => void doTransition(receivable, 'accepted')}>Aceptar</button>}
          {receivable.status === 'submitted' && <button className="row-action" onClick={() => void doTransition(receivable, 'rejected')}>Rechazar</button>}
        </span>
      </div>)}
      {receivables?.length === 0 && <p className="dialog-state">Sin cuentas por cobrar con estos filtros.</p>}
    </div>
    {detail && <ReceivableDetail receivable={detail} onClose={() => setDetail(undefined)} />}
  </div>;
}

function BatchesTab({ payerId, onNotice }: { payerId: string; onNotice: (message: string) => Promise<void> }) {
  const [batches, setBatches] = useState<PayerSubmissionBatch[]>();
  const [selected, setSelected] = useState<PayerSubmissionBatch>();
  const [lines, setLines] = useState<PayerReceivable[]>();
  const [draftReceivables, setDraftReceivables] = useState<PayerReceivable[]>();

  const load = () => operationsApi.submissionBatches(payerId || undefined).then(setBatches);
  useEffect(() => { void load(); }, [payerId]);

  useEffect(() => {
    if (!selected) return;
    operationsApi.submissionLines(selected.id).then(async (submissionLines) => {
      const receivables = await Promise.all(submissionLines.map((line) => operationsApi.payerReceivable(line.receivable_id)));
      setLines(receivables);
    });
    if (selected.status === 'draft') {
      operationsApi.payerReceivables({ payer_id: selected.payer_id, status_filter: 'draft' }).then(setDraftReceivables);
    }
  }, [selected]);

  async function createBatch() {
    if (!payerId) { window.alert('Selecciona una dependencia primero.'); return; }
    const batch = await operationsApi.createSubmissionBatch({ payer_id: payerId });
    await load();
    setSelected(batch);
    await onNotice('Lote de presentación creado.');
  }

  return <div className="settings-tab-content">
    <div className="module-toolbar"><h2>Lotes de presentación</h2><button className="primary-action" onClick={() => void createBatch()}>+ Nuevo lote</button></div>
    {!selected && <div className="component-list">
      {batches?.map((batch) => <div className="component-row" key={batch.id}>
        <span><b>{batch.batch_number}</b><small>{batch.status === 'draft' ? 'Borrador' : 'Presentado'}{batch.submitted_at ? ` · ${new Date(batch.submitted_at).toLocaleDateString('es-MX')}` : ''}</small></span>
        <button className="row-action" onClick={() => setSelected(batch)}>Ver</button>
      </div>)}
      {batches?.length === 0 && <p className="dialog-state">Sin lotes todavía.</p>}
    </div>}
    {selected && <>
      <button className="dialog-back" onClick={() => setSelected(undefined)}>‹ Volver a lotes</button>
      <div className="module-toolbar"><h2>Lote {selected.batch_number}</h2>
        {selected.status === 'draft' && <button className="primary-action" onClick={async () => {
          await operationsApi.submitBatch(selected.id);
          const refreshed = await operationsApi.submissionBatch(selected.id);
          setSelected(refreshed);
          await load();
          await onNotice('Lote presentado a la dependencia.');
        }}>Presentar lote</button>}
      </div>
      <div className="component-list">
        {lines?.map((receivable) => <div className="component-row" key={receivable.id}>
          <span><b>{money(receivable.original_amount)} {receivable.currency}</b><small>{receivable.service_date} · {STATUS_LABELS[receivable.status]}</small></span>
        </div>)}
        {lines?.length === 0 && <p className="dialog-state">Sin receivables en este lote.</p>}
      </div>
      {selected.status === 'draft' && draftReceivables && draftReceivables.length > 0 && <>
        <p className="form-note">Receivables en borrador disponibles para agregar:</p>
        <div className="component-list">
          {draftReceivables.filter((r) => !lines?.some((l) => l.id === r.id)).map((receivable) => <div className="component-row" key={receivable.id}>
            <span><b>{money(receivable.original_amount)}</b><small>{receivable.service_date}</small></span>
            <button className="row-action" onClick={async () => {
              await operationsApi.addSubmissionLine(selected.id, receivable.id);
              const submissionLines = await operationsApi.submissionLines(selected.id);
              const receivables = await Promise.all(submissionLines.map((line) => operationsApi.payerReceivable(line.receivable_id)));
              setLines(receivables);
              await onNotice('Receivable agregado al lote.');
            }}>Agregar</button>
          </div>)}
        </div>
      </>}
    </>}
  </div>;
}

function RemittancesTab({ payerId, onNotice }: { payerId: string; onNotice: (message: string) => Promise<void> }) {
  const [remittances, setRemittances] = useState<PayerRemittance[]>();
  const [selected, setSelected] = useState<PayerRemittanceSummary>();
  const [acceptedReceivables, setAcceptedReceivables] = useState<PayerReceivable[]>();
  const [amount, setAmount] = useState('');

  const load = () => operationsApi.remittances(payerId || undefined).then(setRemittances);
  useEffect(() => { void load(); }, [payerId]);

  async function openRemittance(remittance: PayerRemittance) {
    const summary = await operationsApi.remittanceSummary(remittance.id);
    setSelected(summary);
    const allocatable = (await operationsApi.payerReceivables({ payer_id: remittance.payer_id })).filter(
      (r) => r.status === 'accepted' || r.status === 'partially_paid' || r.status === 'disputed',
    );
    setAcceptedReceivables(allocatable);
  }

  async function createRemittanceHandler() {
    if (!payerId) { window.alert('Selecciona una dependencia primero.'); return; }
    const total = window.prompt('Monto total recibido (MXN):');
    if (!total) return;
    const remittance = await operationsApi.createRemittance({ payer_id: payerId, received_date: new Date().toISOString().slice(0, 10), total_amount: total });
    await load();
    await openRemittance(remittance);
    await onNotice('Pago de dependencia registrado. Concilia contra las cuentas por cobrar.');
  }

  return <div className="settings-tab-content">
    <div className="module-toolbar"><h2>Pagos de dependencias</h2><button className="primary-action" onClick={() => void createRemittanceHandler()}>+ Registrar pago</button></div>
    {!selected && <div className="component-list">
      {remittances?.map((remittance) => <div className="component-row" key={remittance.id}>
        <span><b>{money(remittance.total_amount)} {remittance.currency}</b><small>{remittance.received_date}{remittance.external_reference ? ` · ${remittance.external_reference}` : ''}</small></span>
        <button className="row-action" onClick={() => void openRemittance(remittance)}>Conciliar</button>
      </div>)}
      {remittances?.length === 0 && <p className="dialog-state">Sin pagos registrados.</p>}
    </div>}
    {selected && <>
      <button className="dialog-back" onClick={() => setSelected(undefined)}>‹ Volver a pagos</button>
      <div className="charge-breakdown">
        <div className="charge-row"><span>Monto total</span><b>{money(selected.remittance.total_amount)}</b></div>
        <div className="charge-row"><span>Asignado</span><b>{money(selected.allocated_amount)}</b></div>
        <div className="charge-row charge-total"><span>Sin asignar</span><b>{money(selected.unallocated_amount)}</b></div>
      </div>
      <p className="form-note">Asignar a una cuenta por cobrar aceptada:</p>
      <div className="component-list">
        {acceptedReceivables?.map((receivable) => <div className="component-row" key={receivable.id}>
          <span><b>{money(receivable.outstanding_amount)} pendiente</b><small>{receivable.service_date} · {STATUS_LABELS[receivable.status]}</small></span>
          <input type="number" step="0.01" placeholder="Monto" value={amount} onChange={(event) => setAmount(event.target.value)} style={{ width: 100 }} />
          <button className="row-action" onClick={async () => {
            try {
              await operationsApi.createAllocation(selected.remittance.id, { receivable_id: receivable.id, allocated_amount: amount });
              await openRemittance(selected.remittance);
              setAmount('');
              await onNotice('Asignación registrada.');
            } catch (error) {
              window.alert(error instanceof Error ? error.message : 'No fue posible asignar.');
            }
          }}>Asignar</button>
        </div>)}
        {acceptedReceivables?.length === 0 && <p className="dialog-state">Sin cuentas por cobrar aceptadas para esta dependencia.</p>}
      </div>
    </>}
  </div>;
}

function CampaignsTab({ onNotice }: { onNotice: (message: string) => Promise<void> }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>();
  const load = () => operationsApi.campaigns().then(setCampaigns);
  useEffect(() => { void load(); }, []);

  async function createCampaignHandler() {
    const code = window.prompt('Código de la campaña (ej. MAMA2026):');
    if (!code) return;
    const name = window.prompt('Nombre:') ?? code;
    await operationsApi.createCampaign({ code, name, valid_from: new Date().toISOString().slice(0, 10) });
    await load();
    await onNotice('Campaña creada.');
  }

  async function toggle(campaign: Campaign) {
    await operationsApi.updateCampaign(campaign.id, { ...campaign, is_active: !campaign.is_active });
    await load();
  }

  return <div className="settings-tab-content">
    <div className="module-toolbar"><h2>Campañas / programas clínicos</h2><button className="primary-action" onClick={() => void createCampaignHandler()}>+ Nueva campaña</button></div>
    <p className="form-note">Una campaña es independiente del pagador — nunca crea ajustes, tarifas ni cuentas por cobrar por sí sola.</p>
    <div className="component-list">
      {campaigns?.map((campaign) => <div className="component-row" key={campaign.id}>
        <span><b>{campaign.name}</b><small>{campaign.code} · {campaign.is_active ? 'Activa' : 'Inactiva'}</small></span>
        <button className="row-action" onClick={() => void toggle(campaign)}>{campaign.is_active ? 'Desactivar' : 'Activar'}</button>
      </div>)}
    </div>
  </div>;
}

export function ReceivablesPage() {
  const [tab, setTab] = useState<Tab>('receivables');
  const [payers, setPayers] = useState<Payer[]>();
  const [payerId, setPayerId] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { void operationsApi.payers().then(setPayers); }, []);
  async function afterAction(message: string) { setNotice(message); }

  return <div className="screen-page">
    <div className="view-label">RECEPCIÓN / ADMINISTRACIÓN</div>
    <div className="screen-heading"><div><h1 className="screen-title">Cuentas por cobrar</h1><p>Ledger de obligaciones de dependencias — separado de Caja y de los cobros al paciente.</p></div></div>
    {notice && <div className="inline-notice success">{notice}</div>}

    <div className="module-toolbar">
      <select value={payerId} onChange={(event) => setPayerId(event.target.value)}>
        <option value="">Todas las dependencias</option>
        {payers?.map((payer) => <option key={payer.id} value={payer.id}>{payer.name}</option>)}
      </select>
    </div>

    <nav className="segmented-tabs">
      {TABS.map((candidate) => <button key={candidate.id} className={tab === candidate.id ? 'active' : ''} onClick={() => setTab(candidate.id)}>{candidate.label}</button>)}
    </nav>

    <section className="module-shell settings-panel">
      {tab === 'receivables' && <ReceivablesTab payerId={payerId} onNotice={afterAction} />}
      {tab === 'batches' && <BatchesTab payerId={payerId} onNotice={afterAction} />}
      {tab === 'remittances' && <RemittancesTab payerId={payerId} onNotice={afterAction} />}
      {tab === 'campaigns' && <CampaignsTab onNotice={afterAction} />}
    </section>
  </div>;
}
