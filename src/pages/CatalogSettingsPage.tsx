import { useEffect, useState } from 'react';
import { operationsApi, type CatalogItem, type CatalogItemDetail, type Payer, type PayerContract, type ProcedureDefinition, type ProcedureTariffMatrixRow } from '../api/operations';
import { CatalogItemFormDialog, PayerContractFormDialog, PayerFormDialog, PayerTariffFormDialog, ProcedureDefinitionFormDialog } from '../components/catalog';
import { OfferingComponentsDialog } from '../components/reception';

type Tab = 'offerings' | 'procedures' | 'composition' | 'prices' | 'payers';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'offerings', label: 'Estudios / Offerings' },
  { id: 'procedures', label: 'Procedimientos' },
  { id: 'composition', label: 'Composición' },
  { id: 'prices', label: 'Precios' },
  { id: 'payers', label: 'Subrogados' },
];

const ELIGIBILITY_LABELS: Record<string, string> = { eligible: '✓ Elegible', ineligible: '✕ No elegible' };

function PayerTariffMatrix({ definition, onNotice }: { definition: ProcedureDefinition; onNotice: (message: string) => Promise<void> }) {
  const [rows, setRows] = useState<ProcedureTariffMatrixRow[]>();
  const [error, setError] = useState('');
  const [tariffForm, setTariffForm] = useState<ProcedureTariffMatrixRow>();

  const load = () => operationsApi.procedurePayerTariffs(definition.id).then(setRows).catch((requestError: Error) => setError(requestError.message));
  useEffect(() => { void load(); }, [definition.id]);

  return <div className="settings-tab-content">
    <div className="module-toolbar"><h2>{definition.name}</h2></div>
    {error && <div className="inline-notice error">{error}</div>}
    {rows === undefined && <p className="dialog-state">Cargando…</p>}
    {rows?.length === 0 && <p className="dialog-state">No hay dependencias con convenio activo configurado todavía.</p>}
    {rows && rows.length > 0 && <div className="tariff-matrix">
      <div className="tariff-matrix-row tariff-matrix-head"><span>Dependencia</span><span>Convenio</span><span>Estado</span><span>Tarifa</span><span>Código</span><span>Vigencia</span><span /></div>
      {rows.map((row) => <div className="tariff-matrix-row" key={`${row.payer_id}-${row.contract_id}`}>
        <span>{row.payer_name}</span>
        <span>{row.contract_name ?? '—'}</span>
        <span>{row.tariff ? ELIGIBILITY_LABELS[row.tariff.eligibility] : '? No configurado'}</span>
        <span>{row.tariff?.eligibility === 'eligible' ? `$${row.tariff.tariff_amount} ${row.tariff.currency}` : '—'}</span>
        <span>{row.tariff?.external_code ?? '—'}</span>
        <span>{row.tariff ? `${row.tariff.valid_from}${row.tariff.valid_to ? ` – ${row.tariff.valid_to}` : ''}` : '—'}</span>
        <button className="row-action" disabled={!row.contract_id} onClick={() => setTariffForm(row)}>{row.tariff ? 'Editar' : 'Configurar'}</button>
      </div>)}
    </div>}
    {tariffForm && tariffForm.contract_id && <PayerTariffFormDialog
      contractId={tariffForm.contract_id} contractLabel={`${tariffForm.payer_name} · ${tariffForm.contract_name}`}
      procedureDefinitionId={definition.id} procedureLabel={definition.name}
      tariff={tariffForm.tariff}
      onClose={() => setTariffForm(undefined)}
      onSaved={async (message) => { await load(); await onNotice(message); }}
    />}
  </div>;
}

function PriceRow({ item, onSaved }: { item: CatalogItem; onSaved: (message: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(item.amount);
  const [currency, setCurrency] = useState(item.currency);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true); setError('');
    try {
      await operationsApi.updateCatalog(item.id, {
        code: item.code, name: item.name, modality: item.modality ?? null, description: item.description ?? null,
        amount, currency, is_active: item.is_active,
      });
      await onSaved(`Precio de "${item.name}" actualizado.`);
      setEditing(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible actualizar el precio.');
    } finally { setBusy(false); }
  }

  return <div className="component-row price-row">
    <span className="modality-chip">{item.modality ?? '—'}</span>
    <span><b>{item.name}</b><small>{item.code}</small></span>
    {editing ? <span className="price-edit-form">
      <input type="number" step="0.01" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <select value={currency} onChange={(event) => setCurrency(event.target.value as 'MXN' | 'USD')}><option>MXN</option><option>USD</option></select>
      <button className="row-action" disabled={busy} onClick={() => void save()}>Guardar</button>
      <button className="row-action" disabled={busy} onClick={() => { setEditing(false); setAmount(item.amount); setCurrency(item.currency); }}>Cancelar</button>
    </span> : <span className="price-display">
      <b>{item.amount} {item.currency}</b>
      <button className="row-action" onClick={() => setEditing(true)}>Editar precio</button>
    </span>}
    {error && <div className="inline-notice error">{error}</div>}
  </div>;
}

export function CatalogSettingsPage() {
  const [tab, setTab] = useState<Tab>('offerings');
  const [catalog, setCatalog] = useState<CatalogItem[]>();
  const [definitions, setDefinitions] = useState<ProcedureDefinition[]>();
  const [details, setDetails] = useState<Record<string, CatalogItemDetail>>({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [catalogForm, setCatalogForm] = useState<CatalogItem | 'new'>();
  const [definitionForm, setDefinitionForm] = useState<ProcedureDefinition | 'new'>();
  const [managedComposition, setManagedComposition] = useState<CatalogItem>();
  const [payerSubTab, setPayerSubTab] = useState<'procedures' | 'payers'>('procedures');
  const [tariffProcedure, setTariffProcedure] = useState<ProcedureDefinition>();
  const [payers, setPayers] = useState<Payer[]>();
  const [selectedPayer, setSelectedPayer] = useState<Payer>();
  const [contracts, setContracts] = useState<PayerContract[]>();
  const [payerForm, setPayerForm] = useState<Payer | 'new'>();
  const [contractForm, setContractForm] = useState<PayerContract | 'new'>();

  const loadPayers = () => operationsApi.payers().then(setPayers).catch((requestError: Error) => setError(requestError.message));
  useEffect(() => { void loadPayers(); }, []);

  const loadContracts = (payerId: string) => operationsApi.payerContracts(payerId).then(setContracts).catch((requestError: Error) => setError(requestError.message));
  useEffect(() => { if (selectedPayer) void loadContracts(selectedPayer.id); }, [selectedPayer]);

  const load = () => Promise.all([operationsApi.catalog(), operationsApi.procedureDefinitions()])
    .then(([items, defs]) => { setCatalog(items); setDefinitions(defs); })
    .catch((requestError: Error) => setError(requestError.message));

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!catalog) return;
    Promise.all(catalog.map((item) => operationsApi.catalogDetail(item.id).then((detail) => [item.id, detail] as const)))
      .then((pairs) => setDetails(Object.fromEntries(pairs)))
      .catch(() => { /* component counts are a nice-to-have; the Offerings list still renders without them */ });
  }, [catalog]);

  async function afterSave(message: string) { setNotice(message); setError(''); await load(); }

  async function toggleActive(item: CatalogItem) {
    try {
      await operationsApi.updateCatalog(item.id, {
        code: item.code, name: item.name, modality: item.modality ?? null, description: item.description ?? null,
        amount: item.amount, currency: item.currency, is_active: !item.is_active,
      });
      await afterSave(`Offering "${item.name}" ${item.is_active ? 'desactivada' : 'activada'}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible cambiar el estado.');
    }
  }

  async function toggleDefinitionActive(definition: ProcedureDefinition) {
    try {
      await operationsApi.updateProcedureDefinition(definition.id, {
        code: definition.code, name: definition.name, modality: definition.modality,
        notes: definition.notes ?? null, is_active: !definition.is_active,
      });
      await afterSave(`Procedimiento "${definition.name}" ${definition.is_active ? 'desactivado' : 'activado'}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible cambiar el estado.');
    }
  }

  async function togglePayerActive(payer: Payer) {
    try {
      await operationsApi.updatePayer(payer.id, { code: payer.code, name: payer.name, notes: payer.notes ?? null, is_active: !payer.is_active });
      setNotice(`Dependencia "${payer.name}" ${payer.is_active ? 'desactivada' : 'activada'}.`);
      await loadPayers();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible cambiar el estado.');
    }
  }

  async function toggleContractActive(contract: PayerContract) {
    try {
      await operationsApi.updatePayerContract(contract.id, {
        name: contract.name, contract_number: contract.contract_number ?? null,
        valid_from: contract.valid_from, valid_to: contract.valid_to ?? null, is_active: !contract.is_active,
      });
      setNotice(`Convenio "${contract.name}" ${contract.is_active ? 'desactivado' : 'activado'}.`);
      if (selectedPayer) await loadContracts(selectedPayer.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible cambiar el estado.');
    }
  }

  return <div className="screen-page">
    <div className="view-label">CONFIGURACIÓN</div>
    <div className="screen-heading"><div><h1 className="screen-title">Catálogo clínico</h1><p>Offerings comerciales, procedimientos clínicos, composición y precio base.</p></div></div>
    {notice && <div className="inline-notice success">{notice}</div>}
    {error && <div className="inline-notice error">{error}</div>}

    <nav className="segmented-tabs">
      {TABS.map((candidate) => <button key={candidate.id} className={tab === candidate.id ? 'active' : ''} onClick={() => setTab(candidate.id)}>{candidate.label}</button>)}
    </nav>

    <section className="module-shell settings-panel">
      {tab === 'offerings' && <div className="settings-tab-content">
        <div className="module-toolbar"><h2>Offerings</h2><button className="primary-action" onClick={() => setCatalogForm('new')}>+ Nueva Offering</button></div>
        {catalog === undefined && <p className="dialog-state">Cargando…</p>}
        <div className="component-list">
          {catalog?.map((item) => {
            const detail = details[item.id];
            const componentCount = detail?.components.length ?? 0;
            return <div className="component-row offering-row" key={item.id}>
              <span className="modality-chip">{item.modality ?? (componentCount ? 'Compuesta' : '—')}</span>
              <span><b>{item.name}</b><small>{item.code} · {item.amount} {item.currency} · {componentCount ? `${componentCount} procedimientos` : 'un solo procedimiento'} · {item.is_active ? 'Activa' : 'Inactiva'}</small></span>
              <span className="component-row-actions">
                <button className="row-action" onClick={() => setCatalogForm(item)}>Editar</button>
                <button className="row-action" onClick={() => setManagedComposition(item)}>Composición</button>
                <button className="row-action" onClick={() => void toggleActive(item)}>{item.is_active ? 'Desactivar' : 'Activar'}</button>
              </span>
            </div>;
          })}
        </div>
      </div>}

      {tab === 'procedures' && <div className="settings-tab-content">
        <div className="module-toolbar"><h2>Biblioteca de procedimientos</h2><button className="primary-action" onClick={() => setDefinitionForm('new')}>+ Nuevo procedimiento</button></div>
        {definitions === undefined && <p className="dialog-state">Cargando…</p>}
        {definitions?.length === 0 && <p className="dialog-state">Aún no hay procedimientos clínicos configurados.</p>}
        <div className="component-list">
          {definitions?.map((definition) => <div className="component-row" key={definition.id}>
            <span className="modality-chip">{definition.modality}</span>
            <span><b>{definition.name}</b><small>{definition.code} · {definition.is_active ? 'Activo' : 'Inactivo'}</small></span>
            <span className="component-row-actions">
              <button className="row-action" onClick={() => setDefinitionForm(definition)}>Editar</button>
              <button className="row-action" onClick={() => void toggleDefinitionActive(definition)}>{definition.is_active ? 'Desactivar' : 'Activar'}</button>
            </span>
          </div>)}
        </div>
      </div>}

      {tab === 'composition' && <div className="settings-tab-content">
        <div className="module-toolbar"><h2>Composición de Offerings</h2></div>
        <p className="form-note">Selecciona una Offering para ver o editar sus componentes clínicos.</p>
        <div className="component-list">
          {catalog?.map((item) => {
            const detail = details[item.id];
            const componentCount = detail?.components.length ?? 0;
            return <div className="component-row" key={item.id}>
              <span className="modality-chip">{componentCount || '1'}</span>
              <span><b>{item.name}</b><small>{componentCount ? `${componentCount} procedimientos` : 'Offering simple, un solo procedimiento'}</small></span>
              <button className="row-action" onClick={() => setManagedComposition(item)}>Ver composición</button>
            </div>;
          })}
        </div>
      </div>}

      {tab === 'prices' && <div className="settings-tab-content">
        <div className="module-toolbar"><h2>Precio base</h2></div>
        <p className="form-note">Solo precio base particular — descuentos, cortesías y tarifas de asegurador se configuran en otro lote.</p>
        <div className="component-list">
          {catalog?.map((item) => <PriceRow key={item.id} item={item} onSaved={afterSave} />)}
        </div>
      </div>}

      {tab === 'payers' && <div className="settings-tab-content">
        <nav className="dialog-tabs">
          <button className={payerSubTab === 'procedures' ? 'active' : ''} onClick={() => setPayerSubTab('procedures')}>Procedimientos</button>
          <button className={payerSubTab === 'payers' ? 'active' : ''} onClick={() => setPayerSubTab('payers')}>Dependencias</button>
        </nav>

        {payerSubTab === 'procedures' && !tariffProcedure && <>
          <p className="form-note">Selecciona un procedimiento para ver o configurar sus tarifas por dependencia.</p>
          <div className="component-list">
            {definitions?.map((definition) => <div className="component-row" key={definition.id}>
              <span className="modality-chip">{definition.modality}</span>
              <span><b>{definition.name}</b><small>{definition.code}</small></span>
              <button className="row-action" onClick={() => setTariffProcedure(definition)}>Ver subrogados</button>
            </div>)}
          </div>
        </>}
        {payerSubTab === 'procedures' && tariffProcedure && <>
          <button className="dialog-back" onClick={() => setTariffProcedure(undefined)}>‹ Volver a procedimientos</button>
          <PayerTariffMatrix definition={tariffProcedure} onNotice={async (message) => setNotice(message)} />
        </>}

        {payerSubTab === 'payers' && !selectedPayer && <>
          <div className="module-toolbar"><h2>Dependencias</h2><button className="primary-action" onClick={() => setPayerForm('new')}>+ Nueva dependencia</button></div>
          <div className="component-list">
            {payers?.map((payer) => <div className="component-row" key={payer.id}>
              <span><b>{payer.name}</b><small>{payer.code} · {payer.is_active ? 'Activa' : 'Inactiva'}</small></span>
              <span className="component-row-actions">
                <button className="row-action" onClick={() => setPayerForm(payer)}>Editar</button>
                <button className="row-action" onClick={() => setSelectedPayer(payer)}>Convenios</button>
                <button className="row-action" onClick={() => void togglePayerActive(payer)}>{payer.is_active ? 'Desactivar' : 'Activar'}</button>
              </span>
            </div>)}
          </div>
        </>}
        {payerSubTab === 'payers' && selectedPayer && <>
          <button className="dialog-back" onClick={() => setSelectedPayer(undefined)}>‹ Volver a dependencias</button>
          <div className="module-toolbar"><h2>Convenios — {selectedPayer.name}</h2><button className="primary-action" onClick={() => setContractForm('new')}>+ Nuevo convenio</button></div>
          <div className="component-list">
            {contracts?.map((contract) => <div className="component-row" key={contract.id}>
              <span><b>{contract.name}</b><small>{contract.valid_from}{contract.valid_to ? ` – ${contract.valid_to}` : ' (sin fecha de término)'} · {contract.is_active ? 'Activo' : 'Inactivo'}</small></span>
              <span className="component-row-actions">
                <button className="row-action" onClick={() => setContractForm(contract)}>Editar</button>
                <button className="row-action" onClick={() => void toggleContractActive(contract)}>{contract.is_active ? 'Desactivar' : 'Activar'}</button>
              </span>
            </div>)}
            {contracts?.length === 0 && <p className="dialog-state">Sin convenios todavía.</p>}
          </div>
        </>}
      </div>}
    </section>

    {catalogForm && <CatalogItemFormDialog item={catalogForm === 'new' ? undefined : catalogForm} onClose={() => setCatalogForm(undefined)} onSaved={afterSave} />}
    {definitionForm && <ProcedureDefinitionFormDialog definition={definitionForm === 'new' ? undefined : definitionForm} onClose={() => setDefinitionForm(undefined)} onSaved={afterSave} />}
    {managedComposition && <OfferingComponentsDialog item={managedComposition} onClose={() => setManagedComposition(undefined)} onSaved={afterSave} />}
    {payerForm && <PayerFormDialog payer={payerForm === 'new' ? undefined : payerForm} onClose={() => setPayerForm(undefined)} onSaved={async (message) => { setNotice(message); await loadPayers(); }} />}
    {contractForm && selectedPayer && <PayerContractFormDialog
      payer={selectedPayer} contract={contractForm === 'new' ? undefined : contractForm}
      onClose={() => setContractForm(undefined)}
      onSaved={async (message) => { setNotice(message); await loadContracts(selectedPayer.id); }}
    />}
  </div>;
}
