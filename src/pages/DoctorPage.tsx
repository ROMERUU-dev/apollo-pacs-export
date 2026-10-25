import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { getStudies, launchStudyViewer, safeViewerUrl, type StudySummary } from '../api/studies';

/**
 * Lista de estudios (médico). The reading list: search + the studies, nothing else. Opening a study
 * launches the apollo-full viewer in its own tab (carrying apolloStudyId so the viewer's in-panel
 * report editor loads that study). Reporting lives inside the viewer now, not on this page.
 */
export function DoctorPage() {
  const [studies, setStudies] = useState<StudySummary[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    getStudies({ page: 1, pageSize: 200 })
      .then((r) => setStudies(r.items))
      .catch((e: Error) => setError(e.message));
  }, []);

  // Open the viewer in its own tab: open a blank tab synchronously (so the popup blocker allows it),
  // then point it at the viewer URL once it resolves, with the backend study id for the report panel.
  function openViewer(study: StudySummary) {
    const win = window.open('', '_blank');
    if (!win) { setError('No se pudo abrir el visor; permite las ventanas emergentes para este sitio.'); return; }
    launchStudyViewer(study.id)
      .then((value) => {
        const url = safeViewerUrl(value.viewerUrl);
        if (!url) throw new Error('Apollo devolvió una URL de visor no segura.');
        const sep = url.includes('?') ? '&' : '?';
        win.location.href = `${url}${sep}apolloStudyId=${encodeURIComponent(study.id)}`;
      })
      .catch((e) => { win.close(); setError((e as Error).message); });
  }
  function openStudy(study: StudySummary) {
    setNotice(undefined);
    if (!study.viewerAvailable) { setNotice('Este estudio no tiene imágenes disponibles para el visor.'); return; }
    openViewer(study);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return studies;
    return studies.filter((s) =>
      [s.patientName, s.description, s.accessionNumber, s.modality, s.medicalRecordNumber]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q))
    );
  }, [studies, query]);

  return <div className="screen-page doctor-page">
    <div className="view-label">LISTA DE ESTUDIOS</div>
    <div className="screen-heading"><div><h1 className="screen-title">Lista de estudios</h1><p>Abre un estudio para verlo y reportarlo en el visor.</p></div></div>
    <section className="module-shell studylist">
      <div className="studylist__bar">
        <span className="studylist__search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar paciente, estudio o accession…"
            aria-label="Buscar estudios"
          />
        </span>
        <span className="studylist__count">{filtered.length} estudio{filtered.length === 1 ? '' : 's'}</span>
      </div>
      <ul className="studylist__list">
        {filtered.map((study) => (
          <li key={study.id}>
            <button type="button" className="studylist__card" onClick={() => openStudy(study)} title="Abrir en el visor">
              <i className="modality-chip">{study.modality}</i>
              <span className="studylist__main">
                <strong>{study.description || 'Estudio'}</strong>
                <small>{study.patientName}{study.accessionNumber ? ` · ${study.accessionNumber}` : ''}</small>
              </span>
              {study.status === 'error' && <i className="urgent-chip">Urgente</i>}
              {study.viewerAvailable && <i className="studylist__open" aria-hidden="true">Abrir ↗</i>}
            </button>
          </li>
        ))}
        {!filtered.length && (
          <li className="studylist__empty">{studies.length ? 'Sin resultados para la búsqueda.' : 'Sin estudios.'}</li>
        )}
      </ul>
      {notice && <div className="inline-notice doctor-error">{notice}</div>}
      {error && <div className="inline-notice error doctor-error">{error}</div>}
    </section>
  </div>;
}
