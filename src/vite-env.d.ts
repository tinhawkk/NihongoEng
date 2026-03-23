/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHEET_PUBLISHED_BASE: string;
  readonly VITE_WEBAPP_URL: string;
  readonly VITE_WEBAPP_SECRET: string;
  readonly VITE_SHEET_ID_ENG: string;
  readonly VITE_SHEET_ID_N5: string;
  readonly VITE_SHEET_ID_N4: string;
  readonly VITE_SHEET_ID_N3: string;
  readonly VITE_SHEET_ID_N2: string;
  readonly VITE_SHEET_ID_N1: string;
  readonly VITE_SHEET_ID_JLPT: string;
  readonly VITE_SHEET_ID_GRAMMAR: string;
  readonly VITE_NHOST_BACKEND_URL: string;
  readonly VITE_HASURA_ADMIN_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
