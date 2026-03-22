/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_RELEASE?: string;
  readonly VITE_ERROR_REPORTING_ENABLED?: string;
  readonly VITE_ERROR_REPORTING_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
