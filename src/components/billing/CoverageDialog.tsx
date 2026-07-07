import { useEffect, useState, type FormEvent } from 'react';
import { operationsApi, type EncounterCoverage, type Payer, type PayerContract } from '../../api/operations';

export function CoverageDialog({ encounterId, current, onClose, onSaved }: {
  encounterId: string;
  current?: EncounterCoverage;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [payers, setPayers] = useState<Payer[]>();
  const [contracts, setContracts] = useState<PayerContract[]>([]);
  const [payerId, setPayerId] = useState(current?.payer_id ?? '');
  const [contractId, setContractId] = useState(current?.contract_id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    operationsApi.payers().then((all) => setPayers(all.filter((p) => p.is_active))).catch((requestError: Error) => setError(requestError.message));
  }, []);

  useEffect(() => {
    if (!payerId) { setContracts([]); return; }
    operationsApi.payerContracts(payerId).then((all) => setContracts(all.filter((c) => c.is_active))).catch((requestError: Error) => setError(requestError.message));
  }, [payerId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payerId) { setError('Selecciona una dependencia.'); return; }
    setBusy(true); setError('');
    try {
      await operationsApi.setEncounterCoverage(encounterId, { payer_id: payerId, contract_id: contractId || null });
      await onSaved('Cobertura de la visita actualizada.');
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible asignar la cobertura.');
    } finally { setBusy(false); }
  }

  async function clearCoverage() {
    setBusy(true); setError('');
    try {
      await operationsApi.clearEncounterCoverage(encounterId);
      await onSaved('La visita vuelve a particular.');
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible quitar la cobertura.');
    } finally { setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="apollo-dialog" role="dialog" aria-modal="true" aria-labelledby="coverage-dialog-title">
      <header>
        <div><span className="panel-kicker">COBERTURA DE LA VISITA</span><h2 id="coverage-dialog-title">Particular o dependencia</h2></div>
        <button className="icon-action" aria-label="Cerrar" onClick={onClose}>×</button>
      </header>
      {error && <div className="inline-notice error">{error}</div>}

      <form className="patient-form" onSubmit={submit}>
        <label>Cobertura
          <select value={payerId} onChange={(event) => { setPayerId(event.target.value); setContractId(''); }}>
            <option value="">Particular</option>
            {payers?.map((payer) => <option value={payer.id} key={payer.id}>{payer.name}</option>)}
          </select>
        </label>
        {payerId && <label>Convenio
          <select value={contractId} onChange={(event) => setContractId(event.target.value)}>
            <option value="">Sin convenio seleccionado</option>
            {contracts.map((contract) => <option value={contract.id} key={contract.id}>{contract.name}</option>)}
          </select>
        </label>}
        {payerId
          ? <button className="primary-action" disabled={busy}>{busy ? 'Guardando…' : 'Asignar cobertura'}</button>
          : <button type="button" className="primary-action" disabled={busy} onClick={() => void clearCoverage()}>Confirmar particular</button>}
      </form>
    </section>
  </div>;
}
