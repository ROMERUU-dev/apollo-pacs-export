import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { getApiHealth, getPacsHealth } from '../../api/health';

type ServiceState = 'loading' | 'online' | 'offline' | 'unavailable' | 'error';

interface ServiceStatus {
  state: ServiceState;
  message: string;
}

interface SystemStatusState {
  backend: ServiceStatus;
  pacs: ServiceStatus;
}

const LOADING_STATE: SystemStatusState = {
  backend: { state: 'loading', message: 'Consultando backend Apollo…' },
  pacs: { state: 'loading', message: 'Consultando PACS vía Apollo…' },
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Error desconocido al consultar el servicio.';
}

function normalizeBackendStatus(): ServiceStatus {
  return {
    state: 'online',
    message: 'API Apollo respondió correctamente.',
  };
}

function normalizeBackendError(error: unknown): ServiceStatus {
  if (error instanceof ApiError) {
    return {
      state: 'error',
      message: error.message,
    };
  }

  return {
    state: 'offline',
    message: getErrorMessage(error),
  };
}

function normalizePacsError(error: unknown): ServiceStatus {
  if (error instanceof ApiError && error.status === 503) {
    return {
      state: 'unavailable',
      message: error.message,
    };
  }

  return {
    state: 'error',
    message: getErrorMessage(error),
  };
}

function normalizePacsStatus(responseStatus: unknown): ServiceStatus {
  if (typeof responseStatus === 'string') {
    const normalized = responseStatus.toLowerCase();
    if (['unavailable', 'offline', 'degraded'].includes(normalized)) {
      return {
        state: 'unavailable',
        message: `PACS reportó estado: ${responseStatus}.`,
      };
    }

    if (normalized === 'error') {
      return {
        state: 'error',
        message: `PACS reportó estado: ${responseStatus}.`,
      };
    }
  }

  return {
    state: 'online',
    message: 'PACS respondió a través del backend Apollo.',
  };
}

function StatusBadge({ state }: { state: ServiceState }) {
  const labels: Record<ServiceState, string> = {
    loading: 'loading',
    online: 'online',
    offline: 'offline',
    unavailable: 'unavailable',
    error: 'error',
  };

  return <span className={`status-badge status-badge--${state}`}>{labels[state]}</span>;
}

export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatusState>(LOADING_STATE);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setStatus(LOADING_STATE);

    const [backendResult, pacsResult] = await Promise.allSettled([
      getApiHealth(),
      getPacsHealth(),
    ]);

    setStatus({
      backend: backendResult.status === 'fulfilled'
        ? normalizeBackendStatus()
        : normalizeBackendError(backendResult.reason),
      pacs: pacsResult.status === 'fulfilled'
        ? normalizePacsStatus(pacsResult.value?.status)
        : normalizePacsError(pacsResult.reason),
    });
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section className="system-status" aria-labelledby="system-status-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Fase 2</p>
          <h2 id="system-status-title">Estado del sistema</h2>
        </div>
        <button className="refresh-button" type="button" onClick={refresh} disabled={isRefreshing}>
          {isRefreshing ? 'Actualizando…' : 'Refrescar'}
        </button>
      </div>

      <div className="status-grid">
        <article className="status-card">
          <div>
            <h3>Apollo Backend</h3>
            <p>{status.backend.message}</p>
          </div>
          <StatusBadge state={status.backend.state} />
        </article>

        <article className="status-card">
          <div>
            <h3>Orthanc vía Apollo</h3>
            <p>{status.pacs.message}</p>
          </div>
          <StatusBadge state={status.pacs.state} />
        </article>
      </div>
    </section>
  );
}
