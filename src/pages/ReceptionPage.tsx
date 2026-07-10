import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { getStudies, type StudySummary } from '../api/studies';
import { operationsApi, type CashAccess, type CashMovement, type CashSession, type CatalogItem, type ExchangeRate, type Order, type OfferingComponent, type Patient, type Payment, type Quote } from '../api/operations';
import { CashModule, OfferingComponentsDialog, OrderManagementDialog, QuotePatientDialog } from '../components/reception';
import { OperationalWorklistTable } from '../components/worklist';
import { useOperationalWorklist } from '../hooks/useOperationalWorklist';
import { catalogTotalMxn } from '../domain/reception';
import { DeviceStatusPanel } from '../platform/desktop';

type Tab = 'catalog' | 'worklist' | 'orders' | 'cash' | 'settings';
const tabLabels: Record<Tab, string> = { catalog: 'Catálogo', worklist: 'Worklist', orders: 'Órdenes', cash: 'Caja', settings: 'Configuración' };
const msg = (error: unknown) => error instanceof Error ? error.message : 'No fue posible completar la operación.';
const money = (value: string | number, currency = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(Number(value));

export function ReceptionPage() {
  const [tab, setTab] = useState<Tab>('catalog');
  const [patients, setPatients] = useState<Patient[]>([]); const [orders, setOrders] = useState<Order[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]); const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]); const [cash, setCash] = useState<CashSession[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]); const [payments, setPayments] = useState<Payment[]>([]);
  const [studies, setStudies] = useState<StudySummary[]>([]); const [cart, setCart] = useState<string[]>([]);
  const [search, setSearch] = useState(''); const [modality, setModality] = useState(''); const [patientId, setPatientId] = useState('');
  const [showAlta, setShowAlta] = useState(false); const [notice, setNotice] = useState<string>();
  const [showQuotePatient, setShowQuotePatient] = useState(false); const [cashAccess, setCashAccess] = useState<CashAccess>();
  const [scheduleOrder, setScheduleOrder] = useState(true);
  const [appointmentMode, setAppointmentMode] = useState<'next_today' | 'scheduled'>('next_today');
  const [appointmentAt, setAppointmentAt] = useState(''); const [slotMinutes, setSlotMinutes] = useState(15);
  const [appointmentStation, setAppointmentStation] = useState(''); const [appointmentAeTitle, setAppointmentAeTitle] = useState('');
  const [managedOrder, setManagedOrder] = useState<Order>();
  const [managedCatalogItem, setManagedCatalogItem] = useState<CatalogItem>();
  const [catalogComponents, setCatalogComponents] = useState<Record<string, OfferingComponent[]>>({});
  const [pendingScheduledQuote, setPendingScheduledQuote] = useState<{ id: string; patientId: string }>();
  const [error, setError] = useState<string>(); const [busy, setBusy] = useState(false);
  const [shareLink, setShareLink] = useState<string>(); const [createdShare, setCreatedShare] = useState<{ studyId: string; shareId: string }>();
  const operational = useOperationalWorklist();

  const load = useCallback(async () => {
    try {
      const values = await Promise.all([operationsApi.patients(), operationsApi.orders(), operationsApi.catalog(), operationsApi.rates(), operationsApi.quotes(), getStudies({ page: 1, pageSize: 100 })]);
      setPatients(values[0]); setOrders(values[1]); setCatalog(values[2]); setRates(values[3]); setQuotes(values[4]); setStudies(values[5].items); setError(undefined);
    } catch (e) { setError(msg(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const missing = catalog.filter((item) => !(item.id in catalogComponents));
    if (!missing.length) return;
    void Promise.all(missing.map((item) => operationsApi.catalogDetail(item.id).then((detail) => [item.id, detail.components] as const)))
      .then((pairs) => setCatalogComponents((current) => ({ ...current, ...Object.fromEntries(pairs) })));
  }, [catalog, catalogComponents]);
  function invalidateCatalogComponents(itemId: string) { setCatalogComponents((current) => { const next = { ...current }; delete next[itemId]; return next; }); }
  const loadCash = useCallback(async () => { const values = await Promise.all([operationsApi.cashSessions(), operationsApi.cashMovements(), operationsApi.payments()]); setCash(values[0]); setMovements(values[1]); setPayments(values[2]); }, []);
  useEffect(() => { if (tab !== 'cash') return; operationsApi.cashAccess().then((access) => { setCashAccess(access); if (access.unlocked) void loadCash(); }).catch((e) => setError(msg(e))); }, [tab, loadCash]);
  async function mutate(work: () => Promise<unknown>, success: string) { setBusy(true); setError(undefined); try { await work(); setNotice(success); await Promise.all([load(), operational.refresh(), cashAccess?.unlocked ? loadCash() : Promise.resolve()]); } catch (e) { setError(msg(e)); } finally { setBusy(false); } }

  const activeRate = rates.find((rate) => rate.is_active); const open = cash.find((item) => item.status === 'open');
  const cartItems = catalog.filter((item) => cart.includes(item.id));
  const cartTotal = catalogTotalMxn(cartItems, activeRate ? Number(activeRate.mxn_per_usd) : undefined);
  const visibleCatalog = catalog.filter((item) => item.is_active && item.name.toLowerCase().includes(search.toLowerCase()) && (!modality || item.modality === modality));
  const modalities = [...new Set(catalog.map((item) => item.modality).filter(Boolean))] as string[];

  function submitPatient(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; void mutate(() => operationsApi.createPatient(Object.fromEntries(new FormData(form))), 'Paciente registrado.').then(() => { form.reset(); setShowAlta(false); }); }
  function submitOrder(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const scheduled = data.get('send_to_worklist') === 'on'; const scheduledAt = String(data.get('scheduled_at') ?? ''); void mutate(() => operationsApi.createOrder({ patient_id: data.get('patient_id'), modality: data.get('modality'), description: data.get('description') || null, priority: data.get('priority') || 'routine', status: scheduled ? 'scheduled' : 'registered', scheduled_at: scheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null, scheduled_station_ae_title: scheduled ? data.get('scheduled_station_ae_title') : null }), 'Orden creada con Accession automático.').then(() => form.reset()); }
  function submitCatalog(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; void mutate(() => operationsApi.createCatalog(Object.fromEntries(new FormData(form))), 'Estudio agregado al catálogo.').then(() => form.reset()); }
  function submitRate(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; void mutate(() => operationsApi.createRate(String(new FormData(form).get('rate'))), 'Tipo de cambio actualizado.').then(() => form.reset()); }
  async function issueQuote(patient: Patient) {
    if (!cart.length) return;
    if (appointmentMode === 'scheduled' && !appointmentAt) { setError('Selecciona la fecha y hora de la cita.'); return; }
    setBusy(true); setError(undefined);
    try {
      const quote = pendingScheduledQuote?.patientId === patient.id
        ? { id: pendingScheduledQuote.id }
        : await operationsApi.createQuote(cart, patient.id);
      setPendingScheduledQuote({ id: quote.id, patientId: patient.id });
      const createdOrders = await operationsApi.scheduleQuote(quote.id, {
        mode: appointmentMode, scheduled_at: appointmentMode === 'scheduled' ? new Date(appointmentAt).toISOString() : null,
        slot_minutes: slotMinutes, station_name: appointmentStation || null, station_ae_title: appointmentAeTitle || null,
      });
      const first = createdOrders[0]?.scheduled_at ? new Date(createdOrders[0].scheduled_at).toLocaleString('es-MX') : 'sin hora';
      setNotice(`Cotización creada y ${createdOrders.length} estudio(s) agendado(s) desde ${first}.`);
      setPatientId(patient.id); setPatients((current) => current.some((item) => item.id === patient.id) ? current : [...current, patient]);
      setCart([]); setPendingScheduledQuote(undefined); setShowQuotePatient(false); await Promise.all([load(), operational.refresh()]);
    } catch (e) { setError(msg(e)); throw e; } finally { setBusy(false); }
  }
  function createShare(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const studyId = String(new FormData(event.currentTarget).get('study')); setBusy(true); operationsApi.createShare(studyId).then((share) => { setShareLink(`${location.origin}${share.redeem_url}`); setCreatedShare({ studyId, shareId: share.id }); }).catch((e) => setError(msg(e))).finally(() => setBusy(false)); }
  function revokeShare() { if (!createdShare) return; void mutate(() => operationsApi.revokeShare(createdShare.studyId, createdShare.shareId), 'Enlace revocado.').then(() => { setShareLink(undefined); setCreatedShare(undefined); }); }

  return <div className="screen-page">
    <div className="view-label">VISTA ACTIVA · ESCRITORIO</div><h1 className="screen-title">Recepción</h1>
    <section className="module-shell reception-shell">
      <div className="module-toolbar"><strong>Recepción</strong><nav className="segmented-tabs">{(['catalog', 'worklist', 'orders', 'cash'] as Tab[]).map((key) => <button className={tab === key ? 'active' : ''} onClick={() => setTab(key)} key={key}>{tabLabels[key]}</button>)}</nav><span className="toolbar-spacer" />
        {tab === 'catalog' && <button className="secondary-action" onClick={() => setShowAlta(!showAlta)}>＋ Dar de alta estudio</button>}
        {tab === 'cash' && cashAccess?.unlocked && open && <span className="cash-pill"><i /> Caja abierta</span>}
        <button className="icon-action" aria-label="Configuración" onClick={() => setTab('settings')}>⚙</button>
      </div>
      {(error || notice) && <div className={error ? 'inline-notice error' : 'inline-notice success'}>{error ?? notice}</div>}

      {tab === 'catalog' && <div className="catalog-layout"><section className="catalog-pane">
        {showAlta && <form className="drawer-form" onSubmit={submitCatalog}><input name="code" required placeholder="Código" /><input name="name" required placeholder="Nombre del estudio" /><select name="modality" defaultValue="DX"><option>DX</option><option>US</option><option>CT</option><option>MR</option><option>MG</option><option>PT</option><option>NM</option></select><input name="amount" required type="number" min="0" step=".01" placeholder="Precio" /><select name="currency"><option>MXN</option><option>USD</option></select><button disabled={busy}>Guardar estudio</button></form>}
        <div className="catalog-filters"><label className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre de estudio" /></label><select aria-label="Filtrar por modalidad" value={modality} onChange={(event) => setModality(event.target.value)}><option value="">Todas las modalidades</option>{modalities.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="catalog-cards">{visibleCatalog.map((item) => {
          const selected = cart.includes(item.id);
          const components = catalogComponents[item.id];
          const isComposite = !!components?.length;
          return <article className={selected ? 'catalog-card selected' : 'catalog-card'} key={item.id}>
            <div><strong>{item.name.toUpperCase()}</strong><button className="square-add" onClick={() => setCart(selected ? cart.filter((id) => id !== item.id) : [...cart, item.id])}>{selected ? '×' : '+'}</button></div>
            <div className="catalog-price">
              <span className="modality-chip-stack">{isComposite
                ? components.map((component) => <span className="modality-chip" key={component.id}>{component.procedure_definition.modality}</span>)
                : <span className="modality-chip">{item.modality ?? item.code}</span>}
              </span>
              <b>{money(item.amount, item.currency)}</b>
            </div>
            <small>Indicaciones para estudio:</small><p>{item.description ?? 'No requiere preparación previa'}</p>
            <button className="offering-components-action" onClick={() => setManagedCatalogItem(item)}>{isComposite ? `⚙ Offering compuesta · ${components.length} procedimientos` : '⚙ Componentes'}</button>
          </article>;
        })}</div>
      </section><aside className="quote-pane"><header><span>COTIZADOR</span><small>{cart.length} estudios</small></header>{!cart.length ? <div className="empty-cart"><span>♧</span><p>Agrega estudios con <b>+</b><br />para armar la cotización</p></div> : <><div className="quote-items">{cartItems.map((item) => { const mxn = item.currency === 'MXN' ? Number(item.amount) : Number(item.amount) * Number(activeRate?.mxn_per_usd ?? 0); const usd = item.currency === 'USD' ? Number(item.amount) : activeRate ? Number(item.amount) / Number(activeRate.mxn_per_usd) : undefined; return <article key={item.id}><strong>{item.name}</strong><button onClick={() => setCart(cart.filter((id) => id !== item.id))}>×</button><span className="modality-chip">{item.modality ?? item.code}</span><b>{money(mxn, 'MXN')}</b><small>{usd !== undefined ? money(usd, 'USD') : 'USD: configura una tasa'}</small></article>; })}</div><footer><div className="appointment-box"><span className="panel-kicker">CITA Y WORKLIST</span><div className="appointment-modes"><button className={appointmentMode === 'next_today' ? 'active' : ''} onClick={() => setAppointmentMode('next_today')}>Hoy · siguiente disponible</button><button className={appointmentMode === 'scheduled' ? 'active' : ''} onClick={() => setAppointmentMode('scheduled')}>Elegir fecha y hora</button></div>{appointmentMode === 'scheduled' && <label>Inicio de la cita<input type="datetime-local" value={appointmentAt} onChange={(e) => setAppointmentAt(e.target.value)} required /></label>}<div className="field-pair"><label>Tiempo por estudio<select value={slotMinutes} onChange={(e) => setSlotMinutes(Number(e.target.value))}><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option></select></label><label>Sala / equipo<input value={appointmentStation} onChange={(e) => setAppointmentStation(e.target.value)} placeholder="Opcional" /></label></div><label>AE Title del equipo<input value={appointmentAeTitle} onChange={(e) => setAppointmentAeTitle(e.target.value)} placeholder="Opcional; no simula MWL" /></label><small>{appointmentMode === 'next_today' ? 'Se agregará después del último estudio activo de hoy.' : 'Si hay varios estudios, ocuparán espacios consecutivos.'}</small></div>{patientId && <div className="selected-patient">Paciente: {patients.find((p) => p.id === patientId)?.first_name} · PatientID {patients.find((p) => p.id === patientId)?.mrn}</div>}<div className="quote-total"><span>Total</span><b>{money(cartTotal, 'MXN')}</b><small>{activeRate ? money(cartTotal / Number(activeRate.mxn_per_usd), 'USD') : 'USD sin tasa activa'}</small></div><button className="primary-action" onClick={() => setShowQuotePatient(true)} disabled={busy || (cartItems.some((i) => i.currency === 'USD') && !activeRate)}>Crear cotización y agendar</button></footer></>}</aside></div>}

      {tab === 'worklist' && <section className="table-screen"><div className="table-tools"><div><h2>Lista de trabajo</h2><p>Compartida con la estación del técnico · estudios del día</p></div><button className="secondary-action" onClick={() => void operational.refresh()}>Actualizar</button></div>{operational.error && <div className="inline-notice error">{operational.error}</div>}{!operational.items.length && orders.some((item) => item.status === 'registered') && <div className="inline-notice warning">Hay {orders.filter((item) => item.status === 'registered').length} orden(es) registrada(s) que aún no tienen programación; por eso no aparecen en Worklist.</div>}<OperationalWorklistTable items={operational.items} /></section>}
      {tab === 'orders' && <section className="table-screen"><div className="table-tools"><div><h2>Órdenes</h2><p>Edita, reprograma o cancela sin perder la auditoría.</p></div><button className="secondary-action" onClick={() => setShowAlta(!showAlta)}>＋ Alta de paciente y orden</button></div>{showAlta && <div className="dual-forms"><form className="drawer-form" onSubmit={submitPatient}><input name="first_name" required placeholder="Nombre(s)" /><input name="last_name" required placeholder="Apellido paterno" /><input name="second_last_name" placeholder="Apellido materno" /><input name="birth_date" required type="date" /><select name="sex" defaultValue="unknown"><option value="unknown">Sexo</option><option value="female">Femenino</option><option value="male">Masculino</option><option value="other">Otro</option></select><small>PatientID asignado automáticamente.</small><button>Guardar paciente</button></form><form className="drawer-form order-form" onSubmit={submitOrder}><select name="patient_id" required defaultValue=""><option value="" disabled>Paciente</option>{patients.map((p) => <option value={p.id} key={p.id}>{p.mrn} · {p.last_name}</option>)}</select><div className="readonly-field">Accession <b>Se asignará al confirmar</b></div><input name="modality" required placeholder="Modalidad" /><input name="description" placeholder="Estudio" /><select name="priority" defaultValue="routine"><option value="routine">Prioridad normal</option><option value="urgent">Urgente</option><option value="stat">STAT</option></select><label className="worklist-toggle"><input name="send_to_worklist" type="checkbox" checked={scheduleOrder} onChange={(event) => setScheduleOrder(event.target.checked)} /> Programar en Worklist</label>{scheduleOrder && <><input name="scheduled_at" required type="datetime-local" aria-label="Fecha y hora programada" /><input name="scheduled_station_ae_title" placeholder="AE Title del equipo (opcional)" /></>}<button>Crear orden</button></form></div>}<DataTable orders={orders} patients={patients} onManage={setManagedOrder} /></section>}

      {tab === 'cash' && <CashModule access={cashAccess} open={open} quotes={quotes} patients={patients} movements={open ? movements.filter((item) => item.cash_session_id === open.id) : []} payments={open ? payments.filter((item) => item.cash_session_id === open.id) : []} activeRate={activeRate} busy={busy} onUnlock={async () => { setBusy(true); try { const access = await operationsApi.unlockCash(); setCashAccess(access); await loadCash(); } catch (e) { setError(msg(e)); } finally { setBusy(false); } }} onLock={async () => { await operationsApi.lockCash(); setCashAccess({ unlocked: false, mode: 'locked' }); setCash([]); setMovements([]); setPayments([]); }} onOpen={(mxn, usd) => mutate(() => operationsApi.openCash(mxn, usd), 'Caja abierta.')} onPay={(quoteId, amount, currency, method) => mutate(() => operationsApi.pay(open!.id, quoteId, amount, currency, method), 'Cobro registrado.')} onMovement={(kind, currency, amount) => mutate(() => operationsApi.createCashMovement(open!.id, kind, currency, amount), 'Movimiento registrado.')} onClose={(mxn, usd) => mutate(() => operationsApi.closeCash(open!.id, mxn, usd), 'Caja cerrada y corte generado.')} />}

      {tab === 'settings' && <section className="settings-screen"><div className="table-tools"><div><h2>Configuración de recepción</h2><p>Moneda, portal temporal y dispositivo</p></div></div><div className="settings-grid"><article><div className="panel-kicker">TIPO DE CAMBIO</div><div className="rate-display">1 USD = <b>{activeRate?.mxn_per_usd ?? 'Sin tasa'}</b> MXN</div><form className="drawer-form" onSubmit={submitRate}><input name="rate" required type="number" min=".000001" step=".000001" placeholder="Nueva tasa" /><button>Activar tasa</button></form><small>{rates.length} registros históricos inmutables</small></article><article><div className="panel-kicker">PORTAL DEL PACIENTE</div><form className="drawer-form" onSubmit={createShare}><select name="study" required defaultValue=""><option value="" disabled>Selecciona estudio</option>{studies.map((s) => <option value={s.id} key={s.id}>{s.patientName} · {s.description}</option>)}</select><button>Crear enlace 72 h</button></form>{shareLink && <><output className="share-link">{shareLink}</output><button className="text-danger" onClick={revokeShare}>Revocar enlace</button></>}</article><DeviceStatusPanel /></div></section>}
    </section>{showQuotePatient && <QuotePatientDialog onClose={() => setShowQuotePatient(false)} onSelect={issueQuote} />}{managedOrder && <OrderManagementDialog order={managedOrder} patient={patients.find((item) => item.id === managedOrder.patient_id)} onClose={() => setManagedOrder(undefined)} onSaved={async (message) => { setNotice(message); await Promise.all([load(), operational.refresh()]); }} />}{managedCatalogItem && <OfferingComponentsDialog item={managedCatalogItem} onClose={() => setManagedCatalogItem(undefined)} onSaved={async (message) => { setNotice(message); invalidateCatalogComponents(managedCatalogItem.id); }} />}
  </div>;
}

function DataTable({ title, subtitle, orders, patients, onManage }: { title?: string; subtitle?: string; orders: Order[]; patients: Patient[]; onManage: (order: Order) => void }) {
  const patient = (id: string) => patients.find((item) => item.id === id);
  return <section className="dense-table"><header>{title && <div><h2>{title}</h2><p>{subtitle}</p></div>}</header><div className="dense-row dense-head order-row"><span>PACIENTE</span><span>MODALIDAD</span><span>ESTUDIO / CITA</span><span>ACCESSION</span><span>ESTADO</span><span>ACCIÓN</span></div>{orders.map((order) => { const p = patient(order.patient_id); return <div className="dense-row order-row" key={order.id}><span><b>{p ? `${p.last_name}, ${p.first_name}` : 'Paciente'}</b><small>PatientID {p?.mrn}</small></span><span><i className="modality-chip">{order.modality}</i></span><span>{order.description ?? 'Estudio de imagen'}<small>{order.scheduled_at ? new Date(order.scheduled_at).toLocaleString('es-MX') : 'Sin programar'}</small></span><span className="mono">{order.accession_number}</span><span><i className={`status-pill ${order.status}`}>● {order.status}</i></span><span><button className="row-action" onClick={() => onManage(order)}>Gestionar</button></span></div>; })}{!orders.length && <div className="empty-table">No hay órdenes registradas</div>}</section>;
}
