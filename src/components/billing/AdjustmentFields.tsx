import type { AdjustmentCreateRequest, AdjustmentType } from '../../api/operations';

const TYPE_LABELS: Record<AdjustmentType, string> = {
  percentage_discount: 'Descuento %',
  fixed_discount: 'Descuento fijo',
  courtesy: 'Cortesía',
  social_support: 'Apoyo social',
};

export const ADJUSTMENT_TYPES = Object.keys(TYPE_LABELS) as AdjustmentType[];

export interface AdjustmentFormState {
  type: AdjustmentType;
  amount: string;
  percentage: string;
  reason: string;
}

export function emptyAdjustmentForm(): AdjustmentFormState {
  return { type: 'percentage_discount', amount: '', percentage: '', reason: '' };
}

export function adjustmentFormToRequest(form: AdjustmentFormState): AdjustmentCreateRequest | { error: string } {
  if (form.type === 'percentage_discount') {
    if (!form.percentage.trim()) return { error: 'Indica el porcentaje.' };
    return { type: form.type, percentage: form.percentage.trim() };
  }
  if (form.type === 'fixed_discount') {
    if (!form.amount.trim()) return { error: 'Indica el monto del descuento.' };
    return { type: form.type, amount: form.amount.trim() };
  }
  if (form.type === 'courtesy') {
    return { type: form.type };
  }
  // social_support
  if (!form.amount.trim()) return { error: 'Indica el monto del apoyo.' };
  if (!form.reason.trim()) return { error: 'El motivo es obligatorio para apoyo social.' };
  return { type: form.type, amount: form.amount.trim(), reason: form.reason.trim() };
}

/** Shared fields for both "aplicar ajuste" (Charge existente) and "resolver revisión
 * financiera" (add-on pendiente) -- same AdjustmentType universe, same required-field rules. */
export function AdjustmentFields({ form, onChange }: { form: AdjustmentFormState; onChange: (next: AdjustmentFormState) => void }) {
  return <>
    <label>Tipo de ajuste
      <select value={form.type} onChange={(event) => onChange({ ...form, type: event.target.value as AdjustmentType })}>
        {ADJUSTMENT_TYPES.map((value) => <option value={value} key={value}>{TYPE_LABELS[value]}</option>)}
      </select>
    </label>

    {form.type === 'percentage_discount' && <label>Porcentaje
      <input type="number" min="0.01" max="100" step="0.01" value={form.percentage} onChange={(event) => onChange({ ...form, percentage: event.target.value })} placeholder="Ej. 20" />
    </label>}

    {(form.type === 'fixed_discount' || form.type === 'social_support') && <label>Monto
      <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => onChange({ ...form, amount: event.target.value })} placeholder="Ej. 200.00" />
    </label>}

    {form.type === 'courtesy' && <p className="form-note">La cortesía anula el neto restante; el precio de referencia se conserva.</p>}

    <label>Motivo{form.type === 'social_support' ? ' (obligatorio)' : ' (opcional)'}
      <textarea value={form.reason} onChange={(event) => onChange({ ...form, reason: event.target.value })} placeholder="Ej. Autorizado por dirección" />
    </label>
  </>;
}
