import { useState, type FormEvent } from 'react';
import { operationsApi, type Payer, type PayerContract } from '../../api/operations';

export function PayerContractFormDialog({ payer, contract, onClose, onSaved }: {
  payer: Payer;
  contract?: PayerContract;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(contract);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const contractNumber = String(data.get('contract_number') ?? '').trim();
    const validFrom = String(data.get('valid_from') ?? '');
    const validTo = String(data.get('valid_to') ?? '');
    const isActive = data.get('is_active') === 'on';
    if (!name || !validFrom) { setError('Completa nombre y vigencia inicial.'); return; }
    setBusy(true); setError('');
    try {
      if (contract) {
        await operationsApi.updatePayerContract(contract.id, {
          name, contract_number: contractNumber || null, valid_from: validFrom, valid_to: validTo || null, is_active: isActive,
        });
        await onSaved('Convenio actualizado.');
      } else {
        await operationsApi.createPayerContract(payer.id, {
          name, contract_number: contractNumber || null, valid_from: validFrom, valid_to: validTo || null,
        });
        await onSaved('Convenio creado.');
      }
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible guardar el convenio.');
    } finally { setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="apollo-dialog" role="dialog" aria-modal="true" aria-labelledby="contract-dialog-title">
      <header>
        <div><span className="panel-kicker">CONVENIO — {payer.name.toUpperCase()}</span><h2 id="contract-dialog-title">{isEdit ? contract!.name : 'Nuevo convenio'}</h2></div>
        <button className="icon-action" aria-label="Cerrar" onClick={onClose}>×</button>
      </header>
      {error && <div className="inline-notice error">{error}</div>}

      <form className="patient-form" onSubmit={submit}>
        <label>Nombre<input name="name" required defaultValue={contract?.name} placeholder="Ej. Convenio 2026" /></label>
        <label>Número de convenio (opcional)<input name="contract_number" defaultValue={contract?.contract_number ?? ''} /></label>
        <div className="field-pair">
          <label>Vigente desde<input name="valid_from" type="date" required defaultValue={contract?.valid_from} /></label>
          <label>Vigente hasta (opcional)<input name="valid_to" type="date" defaultValue={contract?.valid_to ?? ''} /></label>
        </div>
        {isEdit && <label className="checkbox-row"><input type="checkbox" name="is_active" defaultChecked={contract?.is_active ?? true} /> Activo</label>}
        <button className="primary-action" disabled={busy}>{busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear convenio'}</button>
      </form>
    </section>
  </div>;
}
