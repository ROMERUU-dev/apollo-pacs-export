import { useEffect, useState, type FormEvent } from 'react';
import { operationsApi, type CatalogItem, type OfferingComponent, type ProcedureDefinition } from '../../api/operations';

type Mode = 'existing' | 'new';

export function OfferingComponentsDialog({ item, onClose, onSaved }: {
  item: CatalogItem;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [components, setComponents] = useState<OfferingComponent[]>();
  const [definitions, setDefinitions] = useState<ProcedureDefinition[]>([]);
  const [mode, setMode] = useState<Mode>('existing');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => Promise.all([operationsApi.catalogDetail(item.id), operationsApi.procedureDefinitions()])
    .then(([detail, allDefinitions]) => { setComponents(detail.components); setDefinitions(allDefinitions); })
    .catch((requestError: Error) => setError(requestError.message));

  useEffect(() => { void load(); }, [item.id]);

  const attached = new Set((components ?? []).map((component) => component.procedure_definition.id));
  const nextSequence = components?.length ?? 0;

  async function attachExisting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const procedureDefinitionId = String(new FormData(event.currentTarget).get('procedure_definition_id') ?? '');
    if (!procedureDefinitionId) { setError('Selecciona una definición de procedimiento.'); return; }
    setBusy(true); setError('');
    try {
      await operationsApi.addCatalogComponent(item.id, { procedure_definition_id: procedureDefinitionId, sequence: nextSequence });
      await load();
      await onSaved('Componente agregado a la Offering.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible agregar el componente.');
    } finally { setBusy(false); }
  }

  async function createAndAttach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const code = String(data.get('code') ?? '').trim();
    const name = String(data.get('name') ?? '').trim();
    const modality = String(data.get('modality') ?? '').trim().toUpperCase();
    if (!code || !name || !modality) { setError('Completa código, nombre y modalidad.'); return; }
    setBusy(true); setError('');
    try {
      const definition = await operationsApi.createProcedureDefinition({ code, name, modality });
      await operationsApi.addCatalogComponent(item.id, { procedure_definition_id: definition.id, sequence: nextSequence });
      await load();
      await onSaved('Procedimiento creado y agregado a la Offering.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible crear el procedimiento.');
    } finally { setBusy(false); }
  }

  async function remove(component: OfferingComponent) {
    setBusy(true); setError('');
    try {
      await operationsApi.removeCatalogComponent(item.id, component.id);
      await load();
      await onSaved('Componente retirado de la Offering.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible retirar el componente.');
    } finally { setBusy(false); }
  }

  const availableDefinitions = definitions.filter((definition) => !attached.has(definition.id));

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="apollo-dialog" role="dialog" aria-modal="true" aria-labelledby="components-dialog-title">
      <header>
        <div><span className="panel-kicker">OFFERING COMPUESTA</span><h2 id="components-dialog-title">{item.name}</h2>
          <p>Cada componente se agenda como un procedimiento independiente, con su propio accession y horario.</p></div>
        <button className="icon-action" aria-label="Cerrar" onClick={onClose}>×</button>
      </header>
      {error && <div className="inline-notice error">{error}</div>}

      <div className="component-list">
        {components === undefined && <p className="dialog-state">Cargando componentes…</p>}
        {components?.length === 0 && <p className="dialog-state">Sin componentes: esta Offering agenda una sola modalidad ({item.modality ?? 'sin definir'}).</p>}
        {components?.map((component, index) => <div className="component-row" key={component.id}>
          <span className="modality-chip">{component.procedure_definition.modality}</span>
          <span><b>{component.procedure_definition.name}</b><small>Secuencia {index + 1} · {component.procedure_definition.code}</small></span>
          <button className="row-action" disabled={busy} onClick={() => void remove(component)}>Quitar</button>
        </div>)}
      </div>

      <nav className="dialog-tabs">
        <button className={mode === 'existing' ? 'active' : ''} onClick={() => setMode('existing')}>Agregar existente</button>
        <button className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}>Nuevo procedimiento</button>
      </nav>

      {mode === 'existing' && <form className="patient-form" onSubmit={attachExisting}>
        <label>Definición de procedimiento
          <select name="procedure_definition_id" required defaultValue="">
            <option value="" disabled>Selecciona una definición</option>
            {availableDefinitions.map((definition) => <option value={definition.id} key={definition.id}>{definition.name} · {definition.modality}</option>)}
          </select>
        </label>
        {!availableDefinitions.length && <p className="form-note">No hay definiciones disponibles para agregar; crea una nueva.</p>}
        <button className="primary-action" disabled={busy || !availableDefinitions.length}>Agregar componente</button>
      </form>}

      {mode === 'new' && <form className="patient-form" onSubmit={createAndAttach}>
        <div className="field-pair">
          <label>Código<input name="code" required placeholder="Ej. PD-MG-BILAT" /></label>
          <label>Modalidad<select name="modality" defaultValue="DX"><option>DX</option><option>US</option><option>CT</option><option>MR</option><option>MG</option><option>PT</option><option>NM</option></select></label>
        </div>
        <label>Nombre del procedimiento<input name="name" required placeholder="Ej. Mastografía bilateral" /></label>
        <p className="form-note">Se crea la definición clínica y se agrega como componente en un solo paso.</p>
        <button className="primary-action" disabled={busy}>Crear y agregar</button>
      </form>}
    </section>
  </div>;
}
