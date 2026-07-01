const DEFAULT_APOLLO_API_URL = 'http://localhost:8000';

export const apiConfig = {
  baseUrl: (import.meta.env.VITE_APOLLO_API_URL || DEFAULT_APOLLO_API_URL).replace(/\/$/, ''),
} as const;
