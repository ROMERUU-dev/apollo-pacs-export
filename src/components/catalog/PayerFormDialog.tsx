import { useState, type FormEvent } from 'react';
import { operationsApi, type Payer } from '../../api/operations';

export function PayerFormDialog({ payer, onClose, onSaved }: {
  payer?: Payer;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(payer);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const code = String(data.get('code') ?? '').trim();
    const name = String(data.get('name') ?? '').trim();
    const notes = String(data.get('notes') ?? '').trim();
    const isActive = data.get('is_active') === 'on';
    if (!code || !name) { setError('Completa código y nombre.'); return; }
    setBusy(true); setError('');
    try {
      if (payer) {
        await operationsApi.updatePayer(payer.id, { code, name, notes: notes || null, is_active: isActive });
        await onSaved('Dependencia actualizada.');
      } else {
        await operationsApi.createPayer({ code, name, notes: notes || null });
        await onSaved('Dependencia creada.');
      }
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible guardar la dependencia.');
    } finally { setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="apollo-dialog" role="dialog" aria-modal="true" aria-labelledby="payer-dialog-title">
      <header>
        <div><span className="panel-kicker">DEPENDENCIA / SUBROGADO</span><h2 id="payer-dialog-title">{isEdit ? payer!.name : 'Nueva dependencia'}</h2>
          <p>Ej. ISSSTE, ISSSTESON, IMSS, Naval — sin lógica especial por nombre.</p></div>
        <button className="icon-action" aria-label="Cerrar" onClick={onClose}>×</button>
      </header>
      {error && <div className="inline-notice error">{error}</div>}

      <form className="patient-form" onSubmit={submit}>
        <div className="field-pair">
          <label>Código<input name="code" required defaultValue={payer?.code} placeholder="Ej. ISSSTESON" /></label>
          <label>Nombre<input name="name" required defaultValue={payer?.name} placeholder="Ej. ISSSTESON" /></label>
        </div>
        <label>Notas (opcional)<textarea name="notes" defaultValue={payer?.notes ?? ''} /></label>
        {isEdit && <label className="checkbox-row"><input type="checkbox" name="is_active" defaultChecked={payer?.is_active ?? true} /> Activa</label>}
        <button className="primary-action" disabled={busy}>{busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear dependencia'}</button>
      </form>
    </section>
  </div>;
}
