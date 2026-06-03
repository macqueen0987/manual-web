/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEFAULT_LOCALE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
