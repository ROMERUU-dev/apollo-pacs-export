import { type FormEvent, useCallback, useEffect, useState } from 'react';
import './studies.css';
import { getStudies, launchStudyViewer } from '../../api/studies';
import type { PaginatedStudies, StudySearchParams, StudySummary } from '../../api/studies';
import type { StudyStatus } from '../../models';
import { EmptyState, ErrorState, LoadingState } from '../states';

const PAGE_SIZE = 20;
const MODALITIES = ['', 'DX', 'CT', 'MR', 'US', 'MG', 'CR'];
const STATUSES: Array<{ value: StudyStatus | ''; label: string }> = [
  { value: '', label: 'Todos los estados' },
  { value: 'scheduled', label: 'Programado' },
  { value: 'received', label: 'Recibido' },
  { value: 'in-progress', label: 'En proceso' },
  { value: 'completed', label: 'Completado' },
  { value: 'error', label: 'Cancelado' },
];

const STATUS_LABELS: Record<StudyStatus, string> = {
  scheduled: 'Programado',
  received: 'Recibido',
  'in-progress': 'En proceso',
  completed: 'Completado',
  reported: 'Reportado',
  error: 'Error',
};

const EMPTY_RESULT: PaginatedStudies = {
  items: [],
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'No fue posible consultar los estudios.';
}

function formatDate(value?: string): string {
  if (!value) return 'Fecha no disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function safeViewerUrl(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function StudiesWorkspace() {
  const [draft, setDraft] = useState<StudySearchParams>({ search: '', modality: '', status: '' });
  const [filters, setFilters] = useState<StudySearchParams>({ search: '', modality: '', status: '' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PaginatedStudies>(EMPTY_RESULT);
  const [selected, setSelected] = useState<StudySummary>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [viewerError, setViewerError] = useState<string>();
  const [isLaunchingViewer, setIsLaunchingViewer] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const response = await getStudies({ ...filters, page, pageSize: PAGE_SIZE });
      setResult(response);
      setSelected((current) => response.items.find((study) => study.id === current?.id));
    } catch (requestError) {
      setResult(EMPTY_RESULT);
      setSelected(undefined);
      setError(errorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setFilters(draft);
  }

  function clearFilters() {
    const cleared: StudySearchParams = { search: '', modality: '', status: '' };
    setDraft(cleared);
    setFilters(cleared);
    setPage(1);
  }

  async function openViewer() {
    if (!selected) return;
    setIsLaunchingViewer(true);
    setViewerError(undefined);
    try {
      const result = await launchStudyViewer(selected.id);
      const viewerUrl = safeViewerUrl(result.viewerUrl);
      if (!viewerUrl) throw new Error('Apollo devolvió una URL de visor no segura.');
      window.open(viewerUrl, '_blank', 'noopener,noreferrer');
    } catch (launchError) {
      setViewerError(errorMessage(launchError));
    } finally {
      setIsLaunchingViewer(false);
    }
  }

  return (
    <section className="studies-workspace" id="technical-worklist" aria-labelledby="studies-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Estación del técnico</p>
          <h2 id="studies-title">Estudios recientes</h2>
        </div>
        <span className="studies-total">{result.total} estudios</span>
      </div>

      <form className="study-filters" onSubmit={applyFilters}>
        <label className="search-field">
          <span>Buscar</span>
          <input
            value={draft.search ?? ''}
            onChange={(event) => setDraft({ ...draft, search: event.target.value })}
            placeholder="Paciente, PatientID, estudio o accession"
          />
        </label>
        <label>
          <span>Modalidad</span>
          <select
            value={draft.modality ?? ''}
            onChange={(event) => setDraft({ ...draft, modality: event.target.value })}
          >
            {MODALITIES.map((modality) => (
              <option value={modality} key={modality || 'all'}>
                {modality || 'Todas'}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Estado</span>
          <select
            value={draft.status ?? ''}
            onChange={(event) => setDraft({ ...draft, status: event.target.value as StudyStatus | '' })}
          >
            {STATUSES.map((status) => (
              <option value={status.value} key={status.value || 'all'}>{status.label}</option>
            ))}
          </select>
        </label>
        <div className="filter-actions">
          <button className="refresh-button" type="submit">Aplicar</button>
          <button className="secondary-button" type="button" onClick={clearFilters}>Limpiar</button>
        </div>
      </form>

      <div className="workspace-grid">
        <div className="study-list" aria-live="polite">
          {isLoading && <LoadingState message="Consultando estudios reales en Apollo…" />}
          {!isLoading && error && <ErrorState message={error} onRetry={load} />}
          {!isLoading && !error && result.items.length === 0 && (
            <EmptyState message="No hay estudios que coincidan con la consulta." />
          )}
          {!isLoading && !error && result.items.map((study) => (
            <button
              className={'study-row' + (selected?.id === study.id ? ' study-row--selected' : '')}
              key={study.id}
              type="button"
              onClick={() => setSelected(study)}
              aria-pressed={selected?.id === study.id}
            >
              <span className="modality-badge">{study.modality}</span>
              <span className="study-main">
                <strong>{study.patientName}</strong>
                <span>{study.description}</span>
                <small>{study.medicalRecordNumber ?? study.patientId} · {formatDate(study.performedAt)}</small>
              </span>
              <span className={'study-status study-status--' + study.status}>
                {STATUS_LABELS[study.status]}
              </span>
            </button>
          ))}

          {!isLoading && !error && result.items.length > 0 && (
            <nav className="pagination" aria-label="Paginación de estudios">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </button>
              <span>Página {result.page} de {result.totalPages}</span>
              <button
                type="button"
                disabled={page >= result.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </button>
            </nav>
          )}
        </div>

        <aside className="study-detail" aria-label="Detalle del estudio seleccionado">
          {!selected ? (
            <EmptyState message="Selecciona un estudio para revisar sus acciones." />
          ) : (
            <>
              <span className="modality-badge">{selected.modality}</span>
              <h3>{selected.patientName}</h3>
              <p>{selected.description}</p>
              <dl>
                <div><dt>Paciente</dt><dd>{selected.medicalRecordNumber ?? selected.patientId}</dd></div>
                <div><dt>Accession</dt><dd>{selected.accessionNumber ?? 'No disponible'}</dd></div>
                <div><dt>Series</dt><dd>{selected.seriesCount ?? 'No disponible'}</dd></div>
                <div><dt>Fecha</dt><dd>{formatDate(selected.performedAt)}</dd></div>
              </dl>
              <button
                className="viewer-button"
                type="button"
                disabled={!selected.viewerAvailable || isLaunchingViewer}
                title={selected.viewerAvailable ? undefined : 'El estudio no está disponible para el visor'}
                onClick={() => void openViewer()}
              >
                {isLaunchingViewer ? 'Preparando visor…' : selected.viewerAvailable ? 'Abrir visor' : 'Visor no disponible'}
              </button>
              {viewerError && <p className="viewer-error" role="alert">{viewerError}</p>}
              <small className="viewer-note">
                El visor solo se abre mediante una URL proporcionada por el backend Apollo.
              </small>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
