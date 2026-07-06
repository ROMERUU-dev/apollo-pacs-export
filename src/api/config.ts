const DEFAULT_APOLLO_API_URL = '/api/v1';
const DEFAULT_STUDIES_PATH = '/studies';

function normalizePath(value: string): string {
  const path = value.trim();
  return path.startsWith('/') ? path : '/' + path;
}

export const apiConfig = {
  baseUrl: (import.meta.env.VITE_APOLLO_API_URL || DEFAULT_APOLLO_API_URL).replace(/\/$/, ''),
  studiesPath: normalizePath(import.meta.env.VITE_APOLLO_STUDIES_PATH || DEFAULT_STUDIES_PATH),
} as const;
