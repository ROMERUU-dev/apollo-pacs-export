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
interface PortalData { study_id: string; patient_name: string; description?: string | null; viewer_url: string; expires_at: string; report?: PortalReport | null; studies?: PortalStudy[]; language?: string }
/** Before the identity check the API returns only the gate state: no name, no study, no report. */
interface PortalGate { verification_required: true; methods?: string[]; attempts_left: number; expires_at: string }
/** After the identity check but before any study: the patient must grant consent for the notice in force. */
interface PortalConsentGate { consent_required: true; notice_version: string; expires_at: string }
type PortalResponse = PortalGate | PortalConsentGate | PortalData;
type IdentityMethod = 'birth_date' | 'last_name';
type Identity = { birth_date: string } | { last_name: string };

export type Lang = 'es' | 'en';

/** Every patient-facing string, by language. Before the identity check the language follows the
 * browser; once the API answers, the language registered at reception wins. */
const TEXTS = {
  es: {
    locale: 'es-MX', title: 'Resultados', secure: 'Entrega segura', secureTitle: 'Enlace personal y cifrado', loading: 'Cargando tus resultados',
    legalNav: 'Información legal y contacto', privacy: 'Aviso de privacidad', tel: 'Tel.', powered: 'Tecnología',
    gateEyebrow: 'Antes de continuar', gateTitle: 'Confirma la identidad del paciente',
    gateText: 'Este enlace es personal. Para proteger los resultados, escribe la fecha de nacimiento del paciente o su apellido paterno.',
    gateGroup: 'Dato para confirmar la identidad', birthDate: 'Fecha de nacimiento', lastName: 'Apellido paterno',
    birthDateField: 'Fecha de nacimiento del paciente', lastNameField: 'Apellido paterno del paciente', lastNamePlaceholder: 'Por ejemplo: García',
    verifying: 'Verificando…', seeResults: 'Ver mis resultados',
    consentEyebrow: 'Antes de ver tus estudios', consentTitle: 'Tu consentimiento',
    consentIntro: 'Para mostrarte tus imágenes e informes tratamos tus datos personales sensibles de salud y te los entregamos de forma digital. Lee el Aviso de Privacidad y confirma tu consentimiento para continuar.',
    consentReadLink: 'Leer el Aviso de Privacidad',
    consentReadNotice: 'He leído el Aviso de Privacidad',
    consentGrant: 'Otorgo mi consentimiento expreso para el tratamiento de mis datos sensibles de salud y la entrega digital de mis estudios',
    consentCta: 'Acepto y continúo', consentSubmitting: 'Guardando…',
    consentError: 'No pudimos registrar tu consentimiento. Inténtalo de nuevo.',
    attemptsLeft: (n: number) => n === 1 ? 'Te queda 1 intento.' : `Te quedan ${n} intentos.`,
    mismatch: (n: number) => n === 1 ? 'La información no coincide. Te queda 1 intento.' : `La información no coincide. Te quedan ${n} intentos.`,
    expiredTitle: 'Este enlace ya no está activo', expiredText: 'Los enlaces son personales y caducan a las 72 horas, o se cierran si se abren en otra sesión.',
    lockedTitle: 'Por seguridad, este enlace se desactivó', lockedText: 'Se agotaron los intentos para confirmar la identidad del paciente. Pide un enlace nuevo y vuelve a intentarlo.',
    otherTitle: 'No pudimos cargar tus resultados', otherText: 'Revisa tu conexión e inténtalo de nuevo en unos minutos.',
    newLink: 'Pedir un enlace nuevo por WhatsApp', keyword: 'Revisar Estudios', writeHint: 'Escribe', writeHintTail: 'y te responderemos con un enlace nuevo.', callHint: 'También puedes llamar al',
    ready: 'Tus resultados están listos', hello: 'Hola', study: 'Estudio de imagen', seeImages: 'Ver mis imágenes',
    viewerHint: 'Se abre el visor de imágenes. Puedes acercar, desplazarte y cambiar de serie con los dedos o el ratón.',
    report: 'Informe', signed: 'Firmado', inProgress: 'En proceso', signedOn: 'Firmado el',
    reportPending: 'El médico radiólogo aún no firma tu informe. En cuanto esté listo lo verás aquí mismo, con este mismo enlace; no necesitas pedir otro.',
    others: 'Otros estudios compartidos', reportSigned: 'Informe firmado', reportInProgress: 'Informe en proceso', see: 'Ver',
    session: 'Sesión activa', until: 'hasta las', sessionTail: 'Si se cierra, vuelve a abrir el enlace que recibiste por WhatsApp.',
  },
  en: {
    locale: 'en-US', title: 'Results', secure: 'Secure delivery', secureTitle: 'Personal, encrypted link', loading: 'Loading your results',
    legalNav: 'Legal information and contact', privacy: 'Privacy notice', tel: 'Phone', powered: 'Powered by',
    gateEyebrow: 'Before you continue', gateTitle: "Confirm the patient's identity",
    gateText: "This link is personal. To protect the results, enter the patient's date of birth or last name.",
    gateGroup: 'Information used to confirm identity', birthDate: 'Date of birth', lastName: 'Last name',
    birthDateField: "Patient's date of birth", lastNameField: "Patient's last name", lastNamePlaceholder: 'For example: Garcia',
    verifying: 'Verifying…', seeResults: 'See my results',
    consentEyebrow: 'Before you see your studies', consentTitle: 'Your consent',
    consentIntro: 'To show your images and reports we process your sensitive personal health data and deliver it to you digitally. Read the Privacy Notice and confirm your consent to continue.',
    consentReadLink: 'Read the Privacy Notice',
    consentReadNotice: 'I have read the Privacy Notice',
    consentGrant: 'I give my express consent for the processing of my sensitive health data and the digital delivery of my studies',
    consentCta: 'I accept and continue', consentSubmitting: 'Saving…',
    consentError: 'We could not record your consent. Please try again.',
    attemptsLeft: (n: number) => n === 1 ? 'You have 1 attempt left.' : `You have ${n} attempts left.`,
    mismatch: (n: number) => n === 1 ? 'The information does not match. You have 1 attempt left.' : `The information does not match. You have ${n} attempts left.`,
    expiredTitle: 'This link is no longer active', expiredText: 'Links are personal and expire after 72 hours, or close if opened in another session.',
    lockedTitle: 'For your safety, this link was disabled', lockedText: "The attempts to confirm the patient's identity ran out. Request a new link and try again.",
    otherTitle: 'We could not load your results', otherText: 'Check your connection and try again in a few minutes.',
    newLink: 'Request a new link on WhatsApp', keyword: 'Revisar Estudios', writeHint: 'Send', writeHintTail: 'and we will reply with a new link.', callHint: 'You can also call',
    ready: 'Your results are ready', hello: 'Hello', study: 'Imaging study', seeImages: 'See my images',
    viewerHint: 'The image viewer opens. You can zoom, scroll and switch series with your fingers or the mouse.',
    report: 'Report', signed: 'Signed', inProgress: 'In progress', signedOn: 'Signed on',
    reportPending: 'The radiologist has not signed your report yet. As soon as it is ready you will see it right here, with this same link; no need to request another.',
    others: 'Other shared studies', reportSigned: 'Report signed', reportInProgress: 'Report in progress', see: 'View',
    session: 'Session active', until: 'until', sessionTail: 'If it closes, open the link you received on WhatsApp again.',
  },
};
type Texts = typeof TEXTS.es;

function browserLang(): Lang {
  return typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'es';
}

function langOf(data?: PortalData): Lang {
  return data?.language === 'en' ? 'en' : data?.language === 'es' ? 'es' : browserLang();
}

type View =
  | { kind: 'loading' }
  | { kind: 'verify'; attemptsLeft: number; message?: string; submitting?: boolean }
  | { kind: 'consent'; noticeVersion: string; submitting?: boolean; error?: boolean }
  | { kind: 'ready'; data: PortalData }
  | { kind: 'error'; reason: 'expired' | 'locked' | 'other' };

function isGate(response: PortalResponse): response is PortalGate {
  return (response as PortalGate).verification_required === true;
}

function isConsentGate(response: PortalResponse): response is PortalConsentGate {
  return (response as PortalConsentGate).consent_required === true;
}

/** Map an API response to the screen it should show: identity gate, consent gate, or the results. */
function viewFor(response: PortalResponse): View {
  if (isGate(response)) return { kind: 'verify', attemptsLeft: response.attempts_left };
  if (isConsentGate(response)) return { kind: 'consent', noticeVersion: response.notice_version };
  return { kind: 'ready', data: response };
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

function formatStudyDate(value: string | null | undefined, locale: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? undefined : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function formatDateTime(value: string | null | undefined, locale: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : new Intl.DateTimeFormat(locale, options).format(date);
}

function errorReason(error: unknown): 'expired' | 'other' {
  return error instanceof ApiError && [401, 403, 404, 409].includes(error.status) ? 'expired' : 'other';
}

function useClinicBrand(t: Texts): ClinicBrand {
  const [brand, setBrand] = useState<ClinicBrand>(FALLBACK_BRAND);
  useEffect(() => { loadBrand().then(setBrand); }, []);
  useEffect(() => {
    document.title = `${t.title} · ${brand.clinic_name}`;
    if (brand.icon_url) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = brand.icon_url;
    }
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = themeColor?.content;
    if (themeColor) themeColor.content = brand.primary ?? '#0d2b4b';
    return () => { if (themeColor && previous) themeColor.content = previous; };
  }, [brand, t]);
  return brand;
}

export function PortalPage() {
  const [view, setView] = useState<View>({ kind: 'loading' });
  const lang = langOf(view.kind === 'ready' ? view.data : undefined);
  const t = TEXTS[lang];
  const brand = useClinicBrand(t);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('portal-html');
    return () => document.documentElement.classList.remove('portal-html');
  }, []);

  useEffect(() => {
    loadPortalSession()
      .then((response) => setView(viewFor(response)))
      .catch((error: unknown) => setView({ kind: 'error', reason: errorReason(error) }));
  }, []);

  const verify = (identity: Identity) => {
    setView((current) => (current.kind === 'verify' ? { ...current, submitting: true, message: undefined } : current));
    operationsApi.portalVerify<PortalResponse>(identity)
      .then((response) => setView(viewFor(response)))
      .catch((error: unknown) => {
        const detail = error instanceof ApiError ? (error.details as { detail?: { reason?: string; attempts_left?: number } } | undefined)?.detail : undefined;
        if (error instanceof ApiError && error.status === 403 && detail?.reason !== 'locked') {
          const attemptsLeft = detail?.attempts_left ?? 0;
          setView({ kind: 'verify', attemptsLeft, message: TEXTS[browserLang()].mismatch(attemptsLeft) });
          return;
        }
        setView({ kind: 'error', reason: error instanceof ApiError && error.status === 403 ? 'locked' : errorReason(error) });
      });
  };

  const grantConsent = () => {
    setView((current) => (current.kind === 'consent' ? { ...current, submitting: true, error: false } : current));
    operationsApi.portalConsent<PortalData>({ accept_notice: true, accept_consent: true })
      .then((data) => setView({ kind: 'ready', data }))
      .catch((error: unknown) => {
        // A revoked or expired link is terminal; anything else keeps the consent screen so the patient can retry.
        if (error instanceof ApiError && [401, 404, 409].includes(error.status)) {
          setView({ kind: 'error', reason: 'expired' });
          return;
        }
        setView((current) => (current.kind === 'consent' ? { ...current, submitting: false, error: true } : current));
      });
  };

  const themeVars = { '--brand-primary': brand.primary, '--brand-accent': brand.accent } as CSSProperties;

  return (
    <div className="portal-root" style={themeVars} lang={lang}>
      <div className="portal-bg" aria-hidden="true" />
      <div className="portal-frame">
        <header className="portal-header portal-rise" style={{ '--i': 0 } as CSSProperties}>
          {brand.logo_url && !logoFailed
            ? <img className="portal-logo" src={brand.logo_url} alt={brand.clinic_name} onError={() => setLogoFailed(true)} />
            : <span className="portal-logo-text"><BelkaLogo size={26} /> {brand.clinic_name}</span>}
          <span className="portal-tag" title={t.secureTitle}><ShieldCheck size={14} /> <span>{t.secure}</span></span>
        </header>

        <main className="portal-main">
          {view.kind === 'loading' && <LoadingCard t={t} />}
          {view.kind === 'verify' && <VerifyCard attemptsLeft={view.attemptsLeft} message={view.message} submitting={view.submitting} onSubmit={verify} t={t} />}
          {view.kind === 'consent' && <ConsentCard submitting={view.submitting} error={view.error} onSubmit={grantConsent} brand={brand} t={t} />}
          {view.kind === 'error' && <ErrorCard reason={view.reason} brand={brand} t={t} />}
          {view.kind === 'ready' && <Results data={view.data} t={t} />}
        </main>

        <footer className="portal-footer portal-rise" style={{ '--i': 5 } as CSSProperties}>
          <nav aria-label={t.legalNav}>
            {brand.privacy_url && <a href={brand.privacy_url}>{t.privacy}</a>}
            {brand.phone && <span>{t.tel} {brand.phone}</span>}
            {brand.city && <span>{brand.city}</span>}
          </nav>
          <p className="portal-powered"><BelkaLogo size={12} /> {t.powered} {BRAND.name}</p>
        </footer>
      </div>
    </div>
  );
}

function LoadingCard({ t }: { t: Texts }) {
  return (
    <article className="portal-card portal-rise" aria-busy="true" aria-label={t.loading}>
      <div className="sk sk--eyebrow" /><div className="sk sk--title" /><div className="sk sk--line" /><div className="sk sk--cta" />
    </article>
  );
}

function VerifyCard({ attemptsLeft, message, submitting, onSubmit, t }: { attemptsLeft: number; message?: string; submitting?: boolean; onSubmit: (identity: Identity) => void; t: Texts }) {
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
      <p className="portal-eyebrow">{t.gateEyebrow}</p>
      <h1 className="portal-gate-title">{t.gateTitle}</h1>
      <p className="portal-gate-text">{t.gateText}</p>
      <form className="portal-form" onSubmit={submit} noValidate>
        <div className="portal-segment" role="radiogroup" aria-label={t.gateGroup}>
          <button type="button" role="radio" aria-checked={method === 'birth_date'} className={method === 'birth_date' ? 'is-active' : ''} onClick={() => setMethod('birth_date')}>{t.birthDate}</button>
          <button type="button" role="radio" aria-checked={method === 'last_name'} className={method === 'last_name' ? 'is-active' : ''} onClick={() => setMethod('last_name')}>{t.lastName}</button>
        </div>
        {method === 'birth_date' ? (
          <label className="portal-field">
            <span>{t.birthDateField}</span>
            <input type="date" value={birthDate} max={today} min="1900-01-01" onChange={(event) => setBirthDate(event.target.value)} autoFocus required />
          </label>
        ) : (
          <label className="portal-field">
            <span>{t.lastNameField}</span>
            <input type="text" value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" autoCapitalize="words" placeholder={t.lastNamePlaceholder} maxLength={120} autoFocus required />
          </label>
        )}
        {message && <p className="portal-form-error" role="alert">{message}</p>}
        <button type="submit" className="portal-cta" disabled={!canSubmit || submitting}>
          <span>{submitting ? t.verifying : t.seeResults}</span><ArrowRight size={20} />
        </button>
        {!message && attemptsLeft < 5 && <p className="portal-hint">{t.attemptsLeft(attemptsLeft)}</p>}
      </form>
    </article>
  );
}

function ConsentCard({ submitting, error, onSubmit, brand, t }: { submitting?: boolean; error?: boolean; onSubmit: () => void; brand: ClinicBrand; t: Texts }) {
  const [readNotice, setReadNotice] = useState(false);
  const [acceptConsent, setAcceptConsent] = useState(false);
  const privacyUrl = brand.privacy_url ?? FALLBACK_BRAND.privacy_url ?? '/privacidad';
  const canSubmit = readNotice && acceptConsent;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    onSubmit();
  };

  return (
    <article className="portal-card portal-rise" style={{ '--i': 1 } as CSSProperties}>
      <div className="portal-gate-icon"><ShieldCheck size={24} /></div>
      <p className="portal-eyebrow">{t.consentEyebrow}</p>
      <h1 className="portal-gate-title">{t.consentTitle}</h1>
      <p className="portal-gate-text">{t.consentIntro}</p>
      <a className="portal-consent-link" href={privacyUrl} target="_blank" rel="noopener noreferrer">
        <FileText size={16} /> <span>{t.consentReadLink}</span>
      </a>
      <form className="portal-form" onSubmit={submit} noValidate>
        <label className="portal-check">
          <input type="checkbox" checked={readNotice} onChange={(event) => setReadNotice(event.target.checked)} />
          <span>{t.consentReadNotice}</span>
        </label>
        <label className="portal-check">
          <input type="checkbox" checked={acceptConsent} onChange={(event) => setAcceptConsent(event.target.checked)} />
          <span>{t.consentGrant}</span>
        </label>
        {error && <p className="portal-form-error" role="alert">{t.consentError}</p>}
        <button type="submit" className="portal-cta" disabled={!canSubmit || submitting}>
          <span>{submitting ? t.consentSubmitting : t.consentCta}</span><ArrowRight size={20} />
        </button>
      </form>
    </article>
  );
}

function ErrorCard({ reason, brand, t }: { reason: 'expired' | 'locked' | 'other'; brand: ClinicBrand; t: Texts }) {
  const copy = {
    expired: { title: t.expiredTitle, text: t.expiredText },
    locked: { title: t.lockedTitle, text: t.lockedText },
    other: { title: t.otherTitle, text: t.otherText },
  }[reason];
  return (
    <article className="portal-card portal-error portal-rise" style={{ '--i': 1 } as CSSProperties}>
      <div className="portal-error-icon">{reason === 'locked' ? <LockKeyhole size={26} /> : <Clock3 size={26} />}</div>
      <h1>{copy.title}</h1>
      <p>{copy.text}</p>
      {brand.whatsapp_url && (
        <a className="portal-cta portal-cta--whatsapp" href={brand.whatsapp_url} rel="noopener">
          <MessageCircle size={20} /><span>{t.newLink}</span>
        </a>
      )}
      <p className="portal-hint">
        {t.writeHint} <strong>{t.keyword}</strong> {t.writeHintTail}
        {brand.phone && <> {t.callHint} {brand.phone}.</>}
      </p>
    </article>
  );
}

function Results({ data, t }: { data: PortalData; t: Texts }) {
  const studies = data.studies ?? [];
  const primary = studies[0];
  const others = studies.slice(1);
  const report = data.report ?? primary?.report ?? undefined;
  const description = data.description ?? primary?.description ?? t.study;
  const studyDate = formatStudyDate(primary?.study_date, t.locale);
  const signedAt = formatDateTime(report?.created_at, t.locale);
  const sessionEnds = formatDateTime(data.expires_at, t.locale, { hour: 'numeric', minute: '2-digit' });

  return (
    <>
      <article className="portal-card portal-rise" style={{ '--i': 1 } as CSSProperties}>
        <p className="portal-eyebrow">{t.ready}</p>
        <h1 className="portal-name">{t.hello}, {formatPatientName(data.patient_name)}</h1>
        <ul className="portal-meta">
          <li><Images size={16} /> {description}</li>
          {studyDate && <li><CalendarDays size={16} /> {studyDate}</li>}
        </ul>
        <a className="portal-cta" href={data.viewer_url}><span>{t.seeImages}</span><ArrowRight size={20} /></a>
        <p className="portal-hint">{t.viewerHint}</p>
      </article>

      <section className="portal-card portal-rise" style={{ '--i': 2 } as CSSProperties} aria-labelledby="portal-informe">
        <header className="portal-card-head">
          <h2 id="portal-informe"><FileText size={18} /> {t.report}</h2>
          {report
            ? <span className="portal-pill portal-pill--ok"><CheckCircle2 size={14} /> {t.signed}</span>
            : <span className="portal-pill portal-pill--wait"><Clock3 size={14} /> {t.inProgress}</span>}
        </header>
        {report
          ? (report.content_html
            ? <div className="portal-report" dangerouslySetInnerHTML={{ __html: sanitizeReportHtml(report.content_html) }} />
            : <div className="portal-report portal-report--plain">{report.content}</div>)
          : <p className="portal-empty">{t.reportPending}</p>}
        {report && signedAt && <p className="portal-small">{t.signedOn} {signedAt}</p>}
      </section>

      {others.length > 0 && (
        <section className="portal-card portal-rise" style={{ '--i': 3 } as CSSProperties} aria-labelledby="portal-otros">
          <header className="portal-card-head"><h2 id="portal-otros"><Images size={18} /> {t.others}</h2></header>
          <ul className="portal-list">
            {others.map((study) => (
              <li key={study.study_id}>
                <div>
                  <strong>{study.description ?? t.study}</strong>
                  <span>{[formatStudyDate(study.study_date, t.locale), study.report_signed ? t.reportSigned : t.reportInProgress].filter(Boolean).join(' · ')}</span>
                </div>
                <a href={study.viewer_url}>{t.see} <ArrowRight size={16} /></a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="portal-session portal-rise" style={{ '--i': 4 } as CSSProperties}>
        <Clock3 size={14} />
        <span>{t.session}{sessionEnds ? ` ${t.until} ${sessionEnds}` : ''} · {t.sessionTail}</span>
      </p>
    </>
  );
}
