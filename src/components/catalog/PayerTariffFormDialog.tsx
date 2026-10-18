import { useState, type FormEvent } from 'react';
import { operationsApi, type PayerProcedureTariff, type TariffEligibility } from '../../api/operations';

export function PayerTariffFormDialog({ contractId, contractLabel, procedureDefinitionId, procedureLabel, tariff, onClose, onSaved }: {
  contractId: string;
  contractLabel: string;
  procedureDefinitionId: string;
  procedureLabel: string;
  tariff?: PayerProcedureTariff;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [eligibility, setEligibility] = useState<TariffEligibility>(tariff?.eligibility ?? 'eligible');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(tariff);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = String(data.get('tariff_amount') ?? '').trim();
    const currency = String(data.get('currency') ?? 'MXN');
    const externalCode = String(data.get('external_code') ?? '').trim();
    const requiresAuthorization = data.get('requires_authorization') === 'on';
    const validFrom = String(data.get('valid_from') ?? '');
    const validTo = String(data.get('valid_to') ?? '');
    const isActive = data.get('is_active') === 'on';
    if (!validFrom) { setError('La vigencia inicial es obligatoria.'); return; }
    if (eligibility === 'eligible' && !amount) { setError('La tarifa es obligatoria cuando el procedimiento es elegible.'); return; }
    setBusy(true); setError('');
    const payload = {
      procedure_definition_id: procedureDefinitionId, eligibility,
      tariff_amount: eligibility === 'eligible' ? amount : null,
      currency: eligibility === 'eligible' ? (currency as 'MXN' | 'USD') : undefined,
      external_code: externalCode || null, requires_authorization: requiresAuthorization,
      valid_from: validFrom, valid_to: validTo || null,
    };
    try {
      if (tariff) {
        await operationsApi.updatePayerTariff(tariff.id, { ...payload, is_active: isActive });
        await onSaved('Tarifa actualizada.');
      } else {
        await operationsApi.createPayerTariff(contractId, payload);
        await onSaved('Tarifa configurada.');
      }
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible guardar la tarifa.');
    } finally { setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="apollo-dialog" role="dialog" aria-modal="true" aria-labelledby="tariff-dialog-title">
      <header>
        <div><span className="panel-kicker">TARIFA — {contractLabel.toUpperCase()}</span><h2 id="tariff-dialog-title">{procedureLabel}</h2></div>
        <button className="icon-action" aria-label="Cerrar" onClick={onClose}>×</button>
      </header>
      {error && <div className="inline-notice error">{error}</div>}

      <form className="patient-form" onSubmit={submit}>
        <label>Estado
          <select value={eligibility} onChange={(event) => setEligibility(event.target.value as TariffEligibility)}>
            <option value="eligible">Elegible</option>
            <option value="ineligible">No elegible</option>
          </select>
        </label>
        {eligibility === 'eligible' && <div className="field-pair">
          <label>Tarifa<input name="tariff_amount" type="number" min="0.01" step="0.01" defaultValue={tariff?.tariff_amount} placeholder="Ej. 920.00" /></label>
          <label>Moneda<select name="currency" defaultValue={tariff?.currency ?? 'MXN'}><option>MXN</option><option>USD</option></select></label>
        </div>}
        <div className="field-pair">
          <label>Código externo (opcional)<input name="external_code" defaultValue={tariff?.external_code ?? ''} placeholder="Ej. 44021" /></label>
          <label className="checkbox-row" style={{ marginTop: 24 }}><input type="checkbox" name="requires_authorization" defaultChecked={tariff?.requires_authorization ?? false} /> Requiere autorización</label>
        </div>
        <div className="field-pair">
          <label>Vigente desde<input name="valid_from" type="date" required defaultValue={tariff?.valid_from} /></label>
          <label>Vigente hasta (opcional)<input name="valid_to" type="date" defaultValue={tariff?.valid_to ?? ''} /></label>
        </div>
        {isEdit && <label className="checkbox-row"><input type="checkbox" name="is_active" defaultChecked={tariff?.is_active ?? true} /> Activa</label>}
        <button className="primary-action" disabled={busy}>{busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Configurar tarifa'}</button>
      </form>
    </section>
  </div>;
}
