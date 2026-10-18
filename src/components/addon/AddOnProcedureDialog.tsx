import { useEffect, useMemo, useState, type FormEvent } from 'react';
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

const MODALITY_ORDER = ['DX', 'MG', 'US', 'CT', 'MR'];

function sortModalities(modalities: string[]): string[] {
  return [...modalities].sort((a, b) => {
    const ai = MODALITY_ORDER.indexOf(a);
    const bi = MODALITY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function AddOnProcedureDialog({ encounterId, patientLabel, defaultSource, onClose, onCreated }: {
  encounterId: string;
  patientLabel: string;
  defaultSource: AddOnSource;
  onClose: () => void;
  onCreated: (order: Order) => Promise<void>;
}) {
  const [definitions, setDefinitions] = useState<ProcedureDefinition[]>();
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [selected, setSelected] = useState<ProcedureDefinition>();
  const [showOptional, setShowOptional] = useState(false);
  const [source, setSource] = useState<AddOnSource>(defaultSource);
  const [requestedByPhysician, setRequestedByPhysician] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    operationsApi.procedureDefinitions(true).then(setDefinitions).catch((requestError: Error) => setLoadError(requestError.message));
  }, []);

  const modalities = useMemo(() => sortModalities([...new Set((definitions ?? []).map((definition) => definition.modality))]), [definitions]);
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (definitions ?? []).filter((definition) => {
      if (modalityFilter !== 'all' && definition.modality !== modalityFilter) return false;
      if (!term) return true;
      return definition.name.toLowerCase().includes(term) || definition.modality.toLowerCase().includes(term);
    });
  }, [definitions, search, modalityFilter]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) { setError('Selecciona un estudio.'); return; }
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
    <section className="apollo-dialog addon-dialog" role="dialog" aria-modal="true" aria-labelledby="addon-dialog-title">
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
          <div className="modality-filter-chips" role="group" aria-label="Filtrar por modalidad">
            <button type="button" className={modalityFilter === 'all' ? 'active' : ''} onClick={() => setModalityFilter('all')}>Todos</button>
            {modalities.map((modality) => (
              <button type="button" key={modality} className={modalityFilter === modality ? 'active' : ''} onClick={() => setModalityFilter(modality)}>{modality}</button>
            ))}
          </div>

          {loadError && <p className="dialog-state error">{loadError}</p>}
          {!loadError && definitions === undefined && <p className="dialog-state">Cargando estudios…</p>}
          {!loadError && definitions !== undefined && definitions.length === 0 && (
            <p className="dialog-state">No hay procedimientos activos configurados. Pide a Recepción que los agregue en Configuración › Catálogo clínico.</p>
          )}
          {!loadError && definitions !== undefined && definitions.length > 0 && matches.length === 0 && (
            <p className="dialog-state">No se encontraron estudios con ese filtro.</p>
          )}

          <div className="addon-picker-grid">
            {matches.map((definition) => (
              <button type="button" className="addon-picker-card" key={definition.id} onClick={() => setSelected(definition)}>
                <span className="modality-chip">{definition.modality}</span>
                <strong>{definition.name}</strong>
              </button>
            ))}
          </div>
        </>}

        {selected && <div className="component-row">
          <span className="modality-chip">{selected.modality}</span>
          <span><b>{selected.name}</b></span>
          <button type="button" className="row-action" onClick={() => setSelected(undefined)}>Cambiar</button>
        </div>}

        {selected && <>
          <button type="button" className="disclosure-toggle" aria-expanded={showOptional} onClick={() => setShowOptional((value) => !value)}>
            <span>{showOptional ? '▾' : '▸'}</span> Detalles opcionales
          </button>
          {showOptional && <div className="disclosure-panel">
            <label>Motivo / origen
              <select value={source} onChange={(event) => setSource(event.target.value as AddOnSource)}>
                {(Object.keys(SOURCE_LABELS) as AddOnSource[]).map((value) => <option value={value} key={value}>{SOURCE_LABELS[value]}</option>)}
              </select>
            </label>
            <label>Médico solicitante (opcional)
              <input value={requestedByPhysician} onChange={(event) => setRequestedByPhysician(event.target.value)} placeholder="Ej. Dra. Gómez" />
            </label>
            <label>Notas (opcional)
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej. Complemento posterior a mastografía" />
            </label>
          </div>}

          <button className="primary-action" disabled={busy}>{busy ? 'Agregando…' : 'Agregar estudio'}</button>
        </>}
      </form>
    </section>
  </div>;
}
