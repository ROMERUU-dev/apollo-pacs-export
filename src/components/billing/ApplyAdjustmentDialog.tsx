import { useState, type FormEvent } from 'react';
import { operationsApi, type Charge } from '../../api/operations';
import { AdjustmentFields, adjustmentFormToRequest, emptyAdjustmentForm } from './AdjustmentFields';

export function ApplyAdjustmentDialog({ charge, onClose, onApplied }: {
  charge: Charge;
  onClose: () => void;
  onApplied: (message: string) => Promise<void>;
}) {
  const [form, setForm] = useState(emptyAdjustmentForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = adjustmentFormToRequest(form);
    if ('error' in parsed) { setError(parsed.error); return; }
    setBusy(true); setError('');
    try {
      await operationsApi.createAdjustment(charge.id, parsed);
      await onApplied('Ajuste aplicado.');
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible aplicar el ajuste.');
    } finally { setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="apollo-dialog" role="dialog" aria-modal="true" aria-labelledby="adjustment-dialog-title">
      <header>
        <div><span className="panel-kicker">AJUSTE FINANCIERO</span><h2 id="adjustment-dialog-title">{charge.name_snapshot}</h2>
          <p>Precio base ${charge.base_amount} · Neto actual ${charge.net_amount}</p></div>
        <button className="icon-action" aria-label="Cerrar" onClick={onClose}>×</button>
      </header>
      {error && <div className="inline-notice error">{error}</div>}

      <form className="patient-form" onSubmit={submit}>
        <AdjustmentFields form={form} onChange={setForm} />
        <button className="primary-action" disabled={busy}>{busy ? 'Aplicando…' : 'Aplicar ajuste'}</button>
      </form>
    </section>
  </div>;
}
