import { useState, type FormEvent } from 'react';
import { operationsApi, type ProcedureDefinition } from '../../api/operations';

const MODALITIES = ['DX', 'MG', 'US', 'CT', 'MR', 'PT', 'NM'];

export function ProcedureDefinitionFormDialog({ definition, onClose, onSaved }: {
  definition?: ProcedureDefinition;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(definition);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const code = String(data.get('code') ?? '').trim();
    const name = String(data.get('name') ?? '').trim();
    const modality = String(data.get('modality') ?? '').trim().toUpperCase();
    const notes = String(data.get('notes') ?? '').trim();
    const isActive = data.get('is_active') === 'on';
    if (!code || !name || !modality) { setError('Completa código, nombre y modalidad.'); return; }
    setBusy(true); setError('');
    try {
      if (definition) {
        await operationsApi.updateProcedureDefinition(definition.id, { code, name, modality, notes: notes || null, is_active: isActive });
        await onSaved('Procedimiento actualizado.');
      } else {
        await operationsApi.createProcedureDefinition({ code, name, modality, notes: notes || null });
        await onSaved('Procedimiento creado.');
      }
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible guardar el procedimiento.');
    } finally { setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="apollo-dialog" role="dialog" aria-modal="true" aria-labelledby="procedure-definition-dialog-title">
      <header>
        <div><span className="panel-kicker">PROCEDIMIENTO CLÍNICO</span><h2 id="procedure-definition-dialog-title">{isEdit ? definition!.name : 'Nuevo procedimiento'}</h2>
          <p>Unidad de ejecución clínica reutilizable — independiente de cómo se vende (Offering).</p></div>
        <button className="icon-action" aria-label="Cerrar" onClick={onClose}>×</button>
      </header>
      {error && <div className="inline-notice error">{error}</div>}

      <form className="patient-form" onSubmit={submit}>
        <div className="field-pair">
          <label>Código<input name="code" required defaultValue={definition?.code} placeholder="Ej. PD-MG-BILAT" /></label>
          <label>Modalidad<select name="modality" defaultValue={definition?.modality ?? 'DX'}>{MODALITIES.map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
        <label>Nombre clínico<input name="name" required defaultValue={definition?.name} placeholder="Ej. Mastografía bilateral" /></label>
        <label>Notas (opcional)<textarea name="notes" defaultValue={definition?.notes ?? ''} placeholder="Indicaciones, preparación del paciente, etc." /></label>
        {isEdit && <label className="checkbox-row"><input type="checkbox" name="is_active" defaultChecked={definition?.is_active ?? true} /> Activo</label>}
        <button className="primary-action" disabled={busy}>{busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear procedimiento'}</button>
      </form>
    </section>
  </div>;
}
