import { useEffect, useState, type FormEvent } from 'react';
import { operationsApi, type Patient } from '../../api/operations';

type Mode = 'choice' | 'new' | 'existing';

const fullName = (patient: Patient) => [patient.first_name, patient.last_name, patient.second_last_name].filter(Boolean).join(' ');
const age = (birthDate: string) => Math.max(0, Math.floor((Date.now() - new Date(birthDate).getTime()) / 31_557_600_000));
const maskedPhone = (phone?: string) => phone ? `•••• ${phone.replace(/\D/g, '').slice(-4)}` : 'Sin teléfono';

export function QuotePatientDialog({ onClose, onSelect }: { onClose: () => void; onSelect: (patient: Patient) => Promise<void> }) {
  const [mode, setMode] = useState<Mode>('choice');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [duplicates, setDuplicates] = useState<Patient[]>([]);
  const [pending, setPending] = useState<Record<string, unknown>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'existing' || search.trim().length < 2) { setResults([]); return; }
    const timer = window.setTimeout(() => {
      setBusy(true); setError('');
      operationsApi.patients(search.trim()).then(setResults).catch((e: Error) => setError(e.message)).finally(() => setBusy(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [mode, search]);

  async function choose(patient: Patient) {
    setBusy(true); setError('');
    try { await onSelect(patient); } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible crear la cotización.'); setBusy(false); }
  }

  async function create(value: Record<string, unknown>, allow = false) {
    setBusy(true); setError('');
    try {
      const patient = await operationsApi.createPatient({ ...value, allow_potential_duplicate: allow });
      await onSelect(patient);
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible registrar al paciente.'); setBusy(false); }
  }

  async function submitNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const value = {
      first_name: String(data.first_name ?? '').trim().replace(/\s+/g, ' '),
      last_name: String(data.last_name ?? '').trim().replace(/\s+/g, ' '),
      second_last_name: String(data.second_last_name ?? '').trim().replace(/\s+/g, ' ') || null,
      birth_date: data.birth_date, sex: data.sex, phone: String(data.phone ?? '').trim() || null,
      email: String(data.email ?? '').trim() || null,
    };
    if (!value.first_name || !value.last_name || !value.birth_date) { setError('Completa nombre, apellido paterno y fecha de nacimiento.'); return; }
    if (new Date(String(value.birth_date)) > new Date()) { setError('La fecha de nacimiento no puede estar en el futuro.'); return; }
    setBusy(true); setError('');
    try {
      const matches = await operationsApi.potentialDuplicates(value);
      if (matches.length) { setPending(value); setDuplicates(matches); setBusy(false); return; }
      await create(value);
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible validar al paciente.'); setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="apollo-dialog" role="dialog" aria-modal="true" aria-labelledby="patient-dialog-title">
      <header><div><span className="panel-kicker">COTIZACIÓN</span><h2 id="patient-dialog-title">Asociar paciente</h2></div><button className="icon-action" aria-label="Cerrar" onClick={onClose}>×</button></header>
      {error && <div className="inline-notice error">{error}</div>}
      {mode === 'choice' && <div className="patient-choice"><button onClick={() => setMode('new')}><b>＋ Nuevo paciente</b><span>Registrar datos y asignar PatientID automáticamente</span></button><button onClick={() => setMode('existing')}><b>⌕ Paciente existente</b><span>Buscar por nombre, PatientID, teléfono o correo</span></button></div>}
      {mode === 'existing' && <><button className="dialog-back" onClick={() => setMode('choice')}>← Volver</button><label className="search-box dialog-search"><span>⌕</span><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, apellidos, PatientID o teléfono" /></label>{busy && <p className="dialog-state">Buscando…</p>} {!busy && search.length >= 2 && !results.length && <p className="dialog-state">No se encontraron pacientes.</p>}<div className="patient-results">{results.map((patient) => <button key={patient.id} onClick={() => void choose(patient)}><span><b>{fullName(patient)}</b><small>PatientID {patient.mrn} · {patient.birth_date} · {age(patient.birth_date)} años</small></span><span>{maskedPhone(patient.phone)} ›</span></button>)}</div></>}
      {mode === 'new' && !duplicates.length && <><button className="dialog-back" onClick={() => setMode('choice')}>← Volver</button><form className="patient-form" onSubmit={submitNew}><label>Nombre(s)<input autoFocus name="first_name" required /></label><div className="field-pair"><label>Apellido paterno<input name="last_name" required /></label><label>Apellido materno<input name="second_last_name" /></label></div><div className="field-pair"><label>Fecha de nacimiento<input name="birth_date" type="date" required /></label><label>Sexo<select name="sex" defaultValue="unknown"><option value="unknown">No especificado</option><option value="female">Femenino</option><option value="male">Masculino</option><option value="other">Otro</option></select></label></div><div className="field-pair"><label>Teléfono<input name="phone" inputMode="tel" /></label><label>Correo electrónico<input name="email" type="email" /></label></div><p className="form-note">El PatientID se asigna en el servidor. No depende de datos personales.</p><button className="primary-action" disabled={busy}>{busy ? 'Validando…' : 'Registrar y continuar'}</button></form></>}
      {!!duplicates.length && <div className="duplicate-warning"><h3>Encontramos pacientes que podrían corresponder a la misma persona.</h3><p>Revisa los datos antes de crear otro registro.</p><div className="patient-results">{duplicates.map((patient) => <button key={patient.id} onClick={() => void choose(patient)}><span><b>{fullName(patient)}</b><small>PatientID {patient.mrn} · {patient.birth_date}</small></span><span>Usar existente ›</span></button>)}</div><div className="dialog-actions"><button onClick={() => setDuplicates([])}>Revisar datos</button><button className="text-danger" disabled={busy} onClick={() => pending && void create(pending, true)}>Crear nuevo de todos modos</button></div></div>}
    </section>
  </div>;
}
