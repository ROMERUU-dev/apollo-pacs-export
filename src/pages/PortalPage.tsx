import { useEffect, useState } from 'react';
import { operationsApi, type ReportVersion } from '../api/operations';
import { BelkaLogo } from '../components/brand';
import { BRAND_FULL } from '../brand';
import { sanitizeReportHtml } from '../components/reporter';

interface PortalData { study_id: string; patient_name: string; description?: string; viewer_url: string; expires_at: string; report?: ReportVersion }
let redemptionInFlight: Promise<PortalData> | undefined;

function loadPortalSession(): Promise<PortalData> {
  const token = new URLSearchParams(location.search).get('token');
  if (token) {
    window.history.replaceState(null, document.title, location.pathname);
    redemptionInFlight ??= operationsApi.redeem<PortalData>(token).finally(() => {
      window.setTimeout(() => { redemptionInFlight = undefined; }, 0);
    });
  }
  return redemptionInFlight ?? operationsApi.portalSession<PortalData>();
}

export function PortalPage() {
  const [data, setData] = useState<PortalData>(); const [error, setError] = useState<string>();
  useEffect(() => {
    loadPortalSession().then(setData).catch((e: Error) => setError(e.message));
  }, []);
  return <main className="portal-shell"><header className="portal-brand"><BelkaLogo className="brand-squirrel" size={28} /> {BRAND_FULL}</header>{error && <p className="alert alert--error">{error}</p>}{data && <article className="portal-card"><p className="eyebrow">Estudio compartido</p><h1>{data.patient_name}</h1><p>{data.description ?? 'Estudio de imagen'}</p><a className="primary-link" href={data.viewer_url}>Ver imágenes</a><section><h2>Informe final</h2>{data.report ? <div className="report-content" dangerouslySetInnerHTML={{ __html: sanitizeReportHtml(data.report.content) }} /> : <div className="report-content">El informe final aún no está disponible.</div>}</section><small>Sesión válida hasta {new Date(data.expires_at).toLocaleString('es-MX')}</small></article>}</main>;
}
