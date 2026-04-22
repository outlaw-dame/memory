import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  css: { preprocessorOptions: { scss: { api: 'modern-compiler' } } },
  plugins: [vue({ template: { compilerOptions: { isCustomElement: tag => tag === 'box-icon' } } }), vueJsx(), vueDevTools(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8794',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '#api': resolve(__dirname, '../api/src')
    }
  },
  // PGlite WASM and transformers.js must not be pre-bundled by Vite —
  // they manage their own WASM loading and dynamic imports internally.
  optimizeDeps: {
    exclude: ['@electric-sql/pglite', '@xenova/transformers'],
  },
  worker: {
    format: 'es',
  },
})
