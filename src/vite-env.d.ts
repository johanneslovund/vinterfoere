/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TOMTOM_KEY: string | undefined;
  readonly VITE_FROST_CLIENT_ID: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
