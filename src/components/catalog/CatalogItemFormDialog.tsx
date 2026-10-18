import { useState, type FormEvent } from 'react';
import { operationsApi, type CatalogItem } from '../../api/operations';

export function CatalogItemFormDialog({ item, onClose, onSaved }: {
  item?: CatalogItem;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(item);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const code = String(data.get('code') ?? '').trim();
    const name = String(data.get('name') ?? '').trim();
    const modality = String(data.get('modality') ?? '').trim();
    const description = String(data.get('description') ?? '').trim();
    const amount = String(data.get('amount') ?? '').trim();
    const currency = String(data.get('currency') ?? 'MXN');
    const isActive = data.get('is_active') === 'on';
    if (!code || !name || !amount) { setError('Completa código, nombre y precio base.'); return; }
    setBusy(true); setError('');
    const payload = { code, name, modality: modality || null, description: description || null, amount, currency, is_active: isEdit ? isActive : true };
    try {
      if (item) {
        await operationsApi.updateCatalog(item.id, payload);
        await onSaved('Offering actualizada.');
      } else {
        await operationsApi.createCatalog(payload);
        await onSaved('Offering creada.');
      }
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible guardar la Offering.');
    } finally { setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="apollo-dialog" role="dialog" aria-modal="true" aria-labelledby="catalog-item-dialog-title">
      <header>
        <div><span className="panel-kicker">OFFERING COMERCIAL</span><h2 id="catalog-item-dialog-title">{isEdit ? item!.name : 'Nueva Offering'}</h2>
          <p>Lo que se vende y cotiza. Si agrupa varios procedimientos, usa la pestaña Composición.</p></div>
        <button className="icon-action" aria-label="Cerrar" onClick={onClose}>×</button>
      </header>
      {error && <div className="inline-notice error">{error}</div>}

      <form className="patient-form" onSubmit={submit}>
        <div className="field-pair">
          <label>Código<input name="code" required defaultValue={item?.code} placeholder="Ej. OFFERING-MAMA" /></label>
          <label>Modalidad (opcional si es compuesta)<input name="modality" defaultValue={item?.modality ?? ''} placeholder="Ej. DX" /></label>
        </div>
        <label>Nombre comercial<input name="name" required defaultValue={item?.name} placeholder="Ej. Evaluación mamaria" /></label>
        <label>Descripción (opcional)<input name="description" defaultValue={item?.description ?? ''} /></label>
        <div className="field-pair">
          <label>Precio base<input name="amount" type="number" step="0.01" min="0" required defaultValue={item?.amount} /></label>
          <label>Moneda<select name="currency" defaultValue={item?.currency ?? 'MXN'}><option>MXN</option><option>USD</option></select></label>
        </div>
        {isEdit && <label className="checkbox-row"><input type="checkbox" name="is_active" defaultChecked={item?.is_active ?? true} /> Activa</label>}
        <button className="primary-action" disabled={busy}>{busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear Offering'}</button>
      </form>
    </section>
  </div>;
}
