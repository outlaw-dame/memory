/// <reference types="vite/client" />

declare module 'vue-iconsax'

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
