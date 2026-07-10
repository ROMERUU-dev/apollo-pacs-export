/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APOLLO_API_URL?: string;
  readonly VITE_APOLLO_STUDIES_PATH?: string;
  readonly VITE_APOLLO_DESKTOP_MODE?: 'auto' | 'browser' | 'mock';
  readonly VITE_APOLLO_E2E_EVIDENCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
