/// <reference types="vite/client" />

declare module 'vue-iconsax'
declare module 'the-big-username-blacklist'

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
