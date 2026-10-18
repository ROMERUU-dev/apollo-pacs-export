import { useState, type FormEvent } from 'react';
import { operationsApi, type Order, type PayerPricingResolution } from '../../api/operations';

export function OverridePayerResolutionDialog({ order, onClose, onOverridden }: {
  order: Order;
  onClose: () => void;
  onOverridden: (resolution: PayerPricingResolution) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [authorizationReference, setAuthorizationReference] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!amount.trim() || !authorizationReference.trim() || !reason.trim()) {
      setError('Monto, folio de autorización y motivo son obligatorios.');
      return;
    }
    setBusy(true); setError('');
    try {
      const resolution = await operationsApi.overridePayerResolution(order.id, {
        amount: amount.trim(), authorization_reference: authorizationReference.trim(), reason: reason.trim(),
      });
      await onOverridden(resolution);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible registrar la excepción autorizada.');
    } finally { setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="apollo-dialog" role="dialog" aria-modal="true" aria-labelledby="override-dialog-title">
      <header>
        <div><span className="panel-kicker">EXCEPCIÓN AUTORIZADA</span><h2 id="override-dialog-title">{order.description ?? 'Estudio'}</h2>
          <p>No cambia la tarifa general del convenio — aplica solo a esta orden.</p></div>
        <button className="icon-action" aria-label="Cerrar" onClick={onClose}>×</button>
      </header>
      {error && <div className="inline-notice error">{error}</div>}

      <form className="patient-form" onSubmit={submit}>
        <label>Monto autorizado
          <input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Ej. 700.00" />
        </label>
        <label>Folio / número de autorización
          <input value={authorizationReference} onChange={(event) => setAuthorizationReference(event.target.value)} placeholder="Ej. FOLIO-123" />
        </label>
        <label>Motivo
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej. Autorizado por la dependencia vía telefónica" />
        </label>
        <button className="primary-action" disabled={busy}>{busy ? 'Guardando…' : 'Registrar excepción'}</button>
      </form>
    </section>
  </div>;
}
