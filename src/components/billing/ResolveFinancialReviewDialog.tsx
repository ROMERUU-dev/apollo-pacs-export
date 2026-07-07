import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { operationsApi, type CatalogItem, type Charge, type Order } from '../../api/operations';
import { AdjustmentFields, adjustmentFormToRequest, emptyAdjustmentForm } from './AdjustmentFields';

export function ResolveFinancialReviewDialog({ order, onClose, onResolved }: {
  order: Order;
  onClose: () => void;
  onResolved: (charge: Charge) => Promise<void>;
}) {
  const [offerings, setOfferings] = useState<CatalogItem[]>();
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CatalogItem>();
  const [applyAdjustment, setApplyAdjustment] = useState(false);
  const [form, setForm] = useState(emptyAdjustmentForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    operationsApi.catalog(true).then(setOfferings).catch((requestError: Error) => setLoadError(requestError.message));
  }, []);

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return offerings ?? [];
    return (offerings ?? []).filter((item) => item.name.toLowerCase().includes(term) || item.code.toLowerCase().includes(term));
  }, [offerings, search]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) { setError('Selecciona la Offering que representa el precio de referencia.'); return; }
    let adjustment;
    if (applyAdjustment) {
      const parsed = adjustmentFormToRequest(form);
      if ('error' in parsed) { setError(parsed.error); return; }
      adjustment = parsed;
    }
    setBusy(true); setError('');
    try {
      const charge = await operationsApi.resolveFinancialReview(order.id, { catalog_item_id: selected.id, adjustment });
      await onResolved(charge);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible resolver la revisión financiera.');
    } finally { setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="apollo-dialog" role="dialog" aria-modal="true" aria-labelledby="resolve-review-dialog-title">
      <header>
        <div><span className="panel-kicker">RESOLVER REVISIÓN FINANCIERA</span><h2 id="resolve-review-dialog-title">{order.description ?? 'Estudio'}</h2>
          <p>Accession {order.accession_number} · Pendiente de revisión</p></div>
        <button className="icon-action" aria-label="Cerrar" onClick={onClose}>×</button>
      </header>
      {error && <div className="inline-notice error">{error}</div>}

      <form className="patient-form" onSubmit={submit}>
        {!selected && <>
          <label>Offering de referencia
            <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar Offering…" />
          </label>
          {loadError && <p className="dialog-state error">{loadError}</p>}
          {!loadError && offerings === undefined && <p className="dialog-state">Cargando…</p>}
          <div className="patient-results">
            {matches.map((item) => <button type="button" key={item.id} onClick={() => setSelected(item)}>
              <span><b>{item.name}</b><small>{item.code}</small></span><span>${item.amount} {item.currency}</span>
            </button>)}
          </div>
        </>}

        {selected && <div className="component-row">
          <span className="modality-chip">{selected.modality ?? '—'}</span>
          <span><b>{selected.name}</b><small>${selected.amount} {selected.currency}</small></span>
          <button type="button" className="row-action" onClick={() => setSelected(undefined)}>Cambiar</button>
        </div>}

        {selected && <label className="checkbox-row">
          <input type="checkbox" checked={applyAdjustment} onChange={(event) => setApplyAdjustment(event.target.checked)} />
          Aplicar un ajuste (descuento, cortesía o apoyo social) — si no, se resuelve como particular.
        </label>}

        {selected && applyAdjustment && <AdjustmentFields form={form} onChange={setForm} />}

        {selected && <button className="primary-action" disabled={busy}>{busy ? 'Resolviendo…' : 'Resolver'}</button>}
      </form>
    </section>
  </div>;
}
