import { useEffect, useState, type FormEvent } from 'react';
import { operationsApi, type AddOnSource, type Order, type ProcedureDefinition } from '../../api/operations';

const SOURCE_LABELS: Record<AddOnSource, string> = {
  direct_physician: 'Indicación directa del médico',
  verbal_physician: 'Indicación verbal del médico',
  technician_protocol: 'Protocolo',
  technician_complement: 'Complemento técnico',
  reception_addition: 'Agregado por recepción',
  external_order: 'Orden externa',
  other: 'Otro',
};

export function AddOnProcedureDialog({ encounterId, patientLabel, defaultSource, onClose, onCreated }: {
  encounterId: string;
  patientLabel: string;
  defaultSource: AddOnSource;
  onClose: () => void;
  onCreated: (order: Order) => Promise<void>;
}) {
  const [definitions, setDefinitions] = useState<ProcedureDefinition[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ProcedureDefinition>();
  const [source, setSource] = useState<AddOnSource>(defaultSource);
  const [requestedByPhysician, setRequestedByPhysician] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    operationsApi.procedureDefinitions().then(setDefinitions).catch((requestError: Error) => setError(requestError.message));
  }, []);

  const matches = definitions.filter((definition) =>
    !selected && definition.name.toLowerCase().includes(search.toLowerCase()));
  const requiresPhysician = source === 'verbal_physician';
  const requiresReason = source === 'other';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) { setError('Selecciona un estudio.'); return; }
    if (requiresPhysician && !requestedByPhysician.trim()) { setError('Indica qué médico dio la indicación verbal.'); return; }
    if (requiresReason && !reason.trim()) { setError('Indica el motivo.'); return; }
    setBusy(true); setError('');
    try {
      const order = await operationsApi.addOnProcedure(encounterId, {
        procedure_definition_id: selected.id,
        source,
        requested_by_physician: requestedByPhysician.trim() || null,
        reason: reason.trim() || null,
      });
      await onCreated(order);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible agregar el estudio.');
    } finally { setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="apollo-dialog" role="dialog" aria-modal="true" aria-labelledby="addon-dialog-title">
      <header>
        <div><span className="panel-kicker">AGREGAR ESTUDIO</span><h2 id="addon-dialog-title">{patientLabel}</h2>
          <p>Se agrega a la visita en curso — sin aprobación electrónica bloqueante.</p></div>
        <button className="icon-action" aria-label="Cerrar" onClick={onClose}>×</button>
      </header>
      {error && <div className="inline-notice error">{error}</div>}

      <form className="patient-form" onSubmit={submit}>
        {!selected && <>
          <label>Buscar estudio
            <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ej. ultrasonido mamario" />
          </label>
          <div className="patient-results">
            {matches.map((definition) => <button type="button" key={definition.id} onClick={() => setSelected(definition)}>
              <span><b>{definition.name.toUpperCase()}</b><small>Modalidad: {definition.modality}</small></span><span>›</span>
            </button>)}
            {search.length >= 2 && !matches.length && <p className="dialog-state">No se encontraron estudios.</p>}
          </div>
        </>}

        {selected && <div className="component-row">
          <span className="modality-chip">{selected.modality}</span>
          <span><b>{selected.name}</b></span>
          <button type="button" className="row-action" onClick={() => setSelected(undefined)}>Cambiar</button>
        </div>}

        <label>Motivo / origen
          <select value={source} onChange={(event) => setSource(event.target.value as AddOnSource)}>
            {(Object.keys(SOURCE_LABELS) as AddOnSource[]).map((value) => <option value={value} key={value}>{SOURCE_LABELS[value]}</option>)}
          </select>
        </label>

        {requiresPhysician && <label>Médico solicitante
          <input required value={requestedByPhysician} onChange={(event) => setRequestedByPhysician(event.target.value)} placeholder="Ej. Dra. Gómez" />
        </label>}

        <label>Notas{requiresReason ? ' (obligatorio)' : ' (opcional)'}
          <textarea required={requiresReason} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej. Complemento posterior a mastografía" />
        </label>

        <button className="primary-action" disabled={busy || !selected}>{busy ? 'Agregando…' : 'Agregar estudio'}</button>
      </form>
    </section>
  </div>;
}
