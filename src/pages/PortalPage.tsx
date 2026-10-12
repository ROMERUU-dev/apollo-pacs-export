import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileText, Images, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react';
import { ApiError } from '../api/client';
import { operationsApi, type ReportVersion } from '../api/operations';
import { BRAND } from '../brand';
import { BelkaLogo } from '../components/brand';
import { sanitizeReportHtml } from '../components/reporter';
import { FALLBACK_BRAND, loadBrand, type ClinicBrand } from '../portal/branding';
import { formatPatientName } from '../portal/patientName';
import '../portal/portal.css';

interface PortalReport extends ReportVersion { signed_by?: string | null; created_at?: string }
interface PortalStudy { study_id: string; study_instance_uid: string; description?: string | null; study_date?: string | null; report_signed: boolean; report?: PortalReport | null; viewer_url: string }
interface PortalData { study_id: string; patient_name: string; description?: string | null; viewer_url: string; expires_at: string; report?: PortalReport | null; studies?: PortalStudy[] }
/** Before the identity check the API returns only the gate state: no name, no study, no report. */
interface PortalGate { verification_required: true; methods?: string[]; attempts_left: number; expires_at: string }
type PortalResponse = PortalGate | PortalData;
type IdentityMethod = 'birth_date' | 'last_name';
type Identity = { birth_date: string } | { last_name: string };

type View =
  | { kind: 'loading' }
  | { kind: 'verify'; attemptsLeft: number; message?: string; submitting?: boolean }
  | { kind: 'ready'; data: PortalData }
  | { kind: 'error'; reason: 'expired' | 'locked' | 'other' };

function isGate(response: PortalResponse): response is PortalGate {
  return (response as PortalGate).verification_required === true;
}

let redemptionInFlight: Promise<PortalResponse> | undefined;

function loadPortalSession(): Promise<PortalResponse> {
  const token = new URLSearchParams(location.search).get('token');
  if (token) {
    window.history.replaceState(null, document.title, location.pathname);
    redemptionInFlight ??= operationsApi.redeem<PortalResponse>(token).finally(() => {
      window.setTimeout(() => { redemptionInFlight = undefined; }, 0);
    });
  }
  return redemptionInFlight ?? operationsApi.portalSession<PortalResponse>();
}

const dateFormat = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
const timeFormat = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' });

function formatStudyDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? undefined : dateFormat.format(date);
}

function formatDateTime(value?: string | null, formatter = dateTimeFormat): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : formatter.format(date);
}

function errorReason(error: unknown): 'expired' | 'other' {
  return error instanceof ApiError && [401, 403, 404, 409].includes(error.status) ? 'expired' : 'other';
}

function useClinicBrand(): ClinicBrand {
  const [brand, setBrand] = useState<ClinicBrand>(FALLBACK_BRAND);
  useEffect(() => { loadBrand().then(setBrand); }, []);
  useEffect(() => {
    document.title = `Resultados · ${brand.clinic_name}`;
    if (brand.icon_url) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = brand.icon_url;
    }
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = themeColor?.content;
    if (themeColor) themeColor.content = brand.primary ?? '#0d2b4b';
    return () => { if (themeColor && previous) themeColor.content = previous; };
  }, [brand]);
  return brand;
}

export function PortalPage() {
  const brand = useClinicBrand();
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('portal-html');
    return () => document.documentElement.classList.remove('portal-html');
  }, []);

  useEffect(() => {
    loadPortalSession()
      .then((response) => setView(isGate(response) ? { kind: 'verify', attemptsLeft: response.attempts_left } : { kind: 'ready', data: response }))
      .catch((error: unknown) => setView({ kind: 'error', reason: errorReason(error) }));
  }, []);

  const verify = (identity: Identity) => {
    setView((current) => (current.kind === 'verify' ? { ...current, submitting: true, message: undefined } : current));
    operationsApi.portalVerify<PortalData>(identity)
      .then((data) => setView({ kind: 'ready', data }))
      .catch((error: unknown) => {
        const detail = error instanceof ApiError ? (error.details as { detail?: { reason?: string; attempts_left?: number } } | undefined)?.detail : undefined;
        if (error instanceof ApiError && error.status === 403 && detail?.reason !== 'locked') {
          const attemptsLeft = detail?.attempts_left ?? 0;
          setView({ kind: 'verify', attemptsLeft, message: attemptsLeft === 1 ? 'La información no coincide. Te queda 1 intento.' : `La información no coincide. Te quedan ${attemptsLeft} intentos.` });
          return;
        }
        setView({ kind: 'error', reason: error instanceof ApiError && error.status === 403 ? 'locked' : errorReason(error) });
      });
  };

  const themeVars = { '--brand-primary': brand.primary, '--brand-accent': brand.accent } as CSSProperties;

  return (
    <div className="portal-root" style={themeVars}>
      <div className="portal-bg" aria-hidden="true" />
      <div className="portal-frame">
        <header className="portal-header portal-rise" style={{ '--i': 0 } as CSSProperties}>
          {brand.logo_url && !logoFailed
            ? <img className="portal-logo" src={brand.logo_url} alt={brand.clinic_name} onError={() => setLogoFailed(true)} />
            : <span className="portal-logo-text"><BelkaLogo size={26} /> {brand.clinic_name}</span>}
          <span className="portal-tag" title="Enlace personal y cifrado"><ShieldCheck size={14} /> <span>Entrega segura</span></span>
        </header>

        <main className="portal-main">
          {view.kind === 'loading' && <LoadingCard />}
          {view.kind === 'verify' && <VerifyCard attemptsLeft={view.attemptsLeft} message={view.message} submitting={view.submitting} onSubmit={verify} />}
          {view.kind === 'error' && <ErrorCard reason={view.reason} brand={brand} />}
          {view.kind === 'ready' && <Results data={view.data} />}
        </main>

        <footer className="portal-footer portal-rise" style={{ '--i': 5 } as CSSProperties}>
          <nav aria-label="Información legal y contacto">
            {brand.privacy_url && <a href={brand.privacy_url}>Aviso de privacidad</a>}
            {brand.phone && <span>Tel. {brand.phone}</span>}
            {brand.city && <span>{brand.city}</span>}
          </nav>
          <p className="portal-powered"><BelkaLogo size={12} /> Tecnología {BRAND.name}</p>
        </footer>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <article className="portal-card portal-rise" aria-busy="true" aria-label="Cargando tus resultados">
      <div className="sk sk--eyebrow" /><div className="sk sk--title" /><div className="sk sk--line" /><div className="sk sk--cta" />
    </article>
  );
}

function VerifyCard({ attemptsLeft, message, submitting, onSubmit }: { attemptsLeft: number; message?: string; submitting?: boolean; onSubmit: (identity: Identity) => void }) {
  const [method, setMethod] = useState<IdentityMethod>('birth_date');
  const [birthDate, setBirthDate] = useState('');
  const [lastName, setLastName] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const canSubmit = method === 'birth_date' ? birthDate.length === 10 : lastName.trim().length >= 2;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    onSubmit(method === 'birth_date' ? { birth_date: birthDate } : { last_name: lastName.trim() });
  };

  return (
    <article className="portal-card portal-rise" style={{ '--i': 1 } as CSSProperties}>
      <div className="portal-gate-icon"><LockKeyhole size={24} /></div>
      <p className="portal-eyebrow">Antes de continuar</p>
      <h1 className="portal-gate-title">Confirma la identidad del paciente</h1>
      <p className="portal-gate-text">Este enlace es personal. Para proteger los resultados, escribe la fecha de nacimiento del paciente o su apellido paterno.</p>
      <form className="portal-form" onSubmit={submit} noValidate>
        <div className="portal-segment" role="radiogroup" aria-label="Dato para confirmar la identidad">
          <button type="button" role="radio" aria-checked={method === 'birth_date'} className={method === 'birth_date' ? 'is-active' : ''} onClick={() => setMethod('birth_date')}>Fecha de nacimiento</button>
          <button type="button" role="radio" aria-checked={method === 'last_name'} className={method === 'last_name' ? 'is-active' : ''} onClick={() => setMethod('last_name')}>Apellido paterno</button>
        </div>
        {method === 'birth_date' ? (
          <label className="portal-field">
            <span>Fecha de nacimiento del paciente</span>
            <input type="date" value={birthDate} max={today} min="1900-01-01" onChange={(event) => setBirthDate(event.target.value)} autoFocus required />
          </label>
        ) : (
          <label className="portal-field">
            <span>Apellido paterno del paciente</span>
            <input type="text" value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" autoCapitalize="words" placeholder="Por ejemplo: García" maxLength={120} autoFocus required />
          </label>
        )}
        {message && <p className="portal-form-error" role="alert">{message}</p>}
        <button type="submit" className="portal-cta" disabled={!canSubmit || submitting}>
          <span>{submitting ? 'Verificando…' : 'Ver mis resultados'}</span><ArrowRight size={20} />
        </button>
        {!message && attemptsLeft < 5 && <p className="portal-hint">Te quedan {attemptsLeft} intentos.</p>}
      </form>
    </article>
  );
}

function ErrorCard({ reason, brand }: { reason: 'expired' | 'locked' | 'other'; brand: ClinicBrand }) {
  const copy = {
    expired: { title: 'Este enlace ya no está activo', text: 'Los enlaces son personales y caducan a las 72 horas, o se cierran si se abren en otra sesión.' },
    locked: { title: 'Por seguridad, este enlace se desactivó', text: 'Se agotaron los intentos para confirmar la identidad del paciente. Pide un enlace nuevo y vuelve a intentarlo.' },
    other: { title: 'No pudimos cargar tus resultados', text: 'Revisa tu conexión e inténtalo de nuevo en unos minutos.' },
  }[reason];
  return (
    <article className="portal-card portal-error portal-rise" style={{ '--i': 1 } as CSSProperties}>
      <div className="portal-error-icon">{reason === 'locked' ? <LockKeyhole size={26} /> : <Clock3 size={26} />}</div>
      <h1>{copy.title}</h1>
      <p>{copy.text}</p>
      {brand.whatsapp_url && (
        <a className="portal-cta portal-cta--whatsapp" href={brand.whatsapp_url} rel="noopener">
          <MessageCircle size={20} /><span>Pedir un enlace nuevo por WhatsApp</span>
        </a>
      )}
      <p className="portal-hint">
        Escribe <strong>Revisar Estudios</strong> y te responderemos con un enlace nuevo.
        {brand.phone && <> También puedes llamar al {brand.phone}.</>}
      </p>
    </article>
  );
}

function Results({ data }: { data: PortalData }) {
  const studies = data.studies ?? [];
  const primary = studies[0];
  const others = studies.slice(1);
  const report = data.report ?? primary?.report ?? undefined;
  const description = data.description ?? primary?.description ?? 'Estudio de imagen';
  const studyDate = formatStudyDate(primary?.study_date);
  const signedAt = formatDateTime(report?.created_at);
  const sessionEnds = formatDateTime(data.expires_at, timeFormat);

  return (
    <>
      <article className="portal-card portal-rise" style={{ '--i': 1 } as CSSProperties}>
        <p className="portal-eyebrow">Tus resultados están listos</p>
        <h1 className="portal-name">Hola, {formatPatientName(data.patient_name)}</h1>
        <ul className="portal-meta">
          <li><Images size={16} /> {description}</li>
          {studyDate && <li><CalendarDays size={16} /> {studyDate}</li>}
        </ul>
        <a className="portal-cta" href={data.viewer_url}><span>Ver mis imágenes</span><ArrowRight size={20} /></a>
        <p className="portal-hint">Se abre el visor de imágenes. Puedes acercar, desplazarte y cambiar de serie con los dedos o el ratón.</p>
      </article>

      <section className="portal-card portal-rise" style={{ '--i': 2 } as CSSProperties} aria-labelledby="portal-informe">
        <header className="portal-card-head">
          <h2 id="portal-informe"><FileText size={18} /> Informe</h2>
          {report
            ? <span className="portal-pill portal-pill--ok"><CheckCircle2 size={14} /> Firmado</span>
            : <span className="portal-pill portal-pill--wait"><Clock3 size={14} /> En proceso</span>}
        </header>
        {report
          ? (report.content_html
            ? <div className="portal-report" dangerouslySetInnerHTML={{ __html: sanitizeReportHtml(report.content_html) }} />
            : <div className="portal-report portal-report--plain">{report.content}</div>)
          : <p className="portal-empty">El médico radiólogo aún no firma tu informe. En cuanto esté listo lo verás aquí mismo, con este mismo enlace; no necesitas pedir otro.</p>}
        {report && signedAt && <p className="portal-small">Firmado el {signedAt}</p>}
      </section>

      {others.length > 0 && (
        <section className="portal-card portal-rise" style={{ '--i': 3 } as CSSProperties} aria-labelledby="portal-otros">
          <header className="portal-card-head"><h2 id="portal-otros"><Images size={18} /> Otros estudios compartidos</h2></header>
          <ul className="portal-list">
            {others.map((study) => (
              <li key={study.study_id}>
                <div>
                  <strong>{study.description ?? 'Estudio de imagen'}</strong>
                  <span>{[formatStudyDate(study.study_date), study.report_signed ? 'Informe firmado' : 'Informe en proceso'].filter(Boolean).join(' · ')}</span>
                </div>
                <a href={study.viewer_url}>Ver <ArrowRight size={16} /></a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="portal-session portal-rise" style={{ '--i': 4 } as CSSProperties}>
        <Clock3 size={14} />
        <span>Sesión activa{sessionEnds ? ` hasta las ${sessionEnds}` : ''} · Si se cierra, vuelve a abrir el enlace que recibiste por WhatsApp.</span>
      </p>
    </>
  );
}
