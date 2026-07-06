import { apiConfig } from './config';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type RequestOptions = Omit<RequestInit, 'body'> & {
  /** Body nativo de Fetch: FormData, Blob, URLSearchParams, string, etc. */
  body?: BodyInit | null;
  /** Valor que debe serializarse como JSON. No puede combinarse con body. */
  json?: unknown;
  /** Tiempo máximo de espera en milisegundos antes de abortar la petición. */
  timeoutMs?: number;
};

async function readResponsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return text;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getErrorMessage(payload: unknown, response: Response): string {
  if (typeof payload === 'string' && payload.trim()) return payload.trim();

  if (payload && typeof payload === 'object') {
    const error = payload as Record<string, unknown>;
    for (const key of ['message', 'detail', 'error', 'title']) {
      if (typeof error[key] === 'string' && error[key]) return error[key];
    }
  }

  return response.statusText || `HTTP ${response.status}`;
}

/**
 * Transporte HTTP genérico para la futura API de Apollo.
 * Los endpoints se agregarán cuando exista un contrato aprobado.
 */
export interface ApiResponse<T> {
  data: T | undefined;
  response: Response;
}

export async function apiRequestWithResponse<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  if (!path.startsWith('/')) {
    throw new Error('Apollo API paths must start with "/".');
  }

  const { body, json, headers: initialHeaders, timeoutMs, signal, ...requestInit } = options;
  if (body !== undefined && body !== null && json !== undefined) {
    throw new Error('Use either "body" or "json" in an Apollo API request, not both.');
  }

  const headers = new Headers(initialHeaders);
  if (json !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let didTimeout = false;
  const controller = timeoutMs ? new AbortController() : undefined;
  const timeoutId = controller
    ? globalThis.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs)
    : undefined;

  if (signal && controller) {
    if (signal.aborted) {
      controller.abort();
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let response: Response;
  try {
    response = await fetch(`${apiConfig.baseUrl}${path}`, {
      ...requestInit,
      credentials: requestInit.credentials ?? 'include',
      headers,
      body: json === undefined ? body : JSON.stringify(json),
      signal: controller?.signal ?? signal,
    });
  } catch (error) {
    if (didTimeout && error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Apollo API request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    if (timeoutId !== undefined) {
      globalThis.clearTimeout(timeoutId);
    }
  }

  const payload = await readResponsePayload(response);

  if (!response.ok) {
    const detail = getErrorMessage(payload, response);
    throw new ApiError(
      `Apollo API request failed (${response.status}): ${detail}`,
      response.status,
      payload,
    );
  }

  return { data: payload as T, response };
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T | undefined> {
  const result = await apiRequestWithResponse<T>(path, options);
  return result.data;
}
