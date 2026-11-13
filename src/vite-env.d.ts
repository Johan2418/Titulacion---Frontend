/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_TIMEZONE?: string
  readonly VITE_STORAGE_ORIGINS?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
