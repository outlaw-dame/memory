import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { resolve, sep } from 'node:path'

function isKnownPglitePackagingWarning(warning: { message?: string; id?: string }): boolean {
  const message = warning.message ?? ''
  const id = warning.id ?? ''
  return (
    id.includes(`${sep}@electric-sql${sep}pglite${sep}`) &&
    (message.includes('Use of eval') || message.includes('is not exported by "__vite-browser-external"'))
  )
}

// https://vite.dev/config/
export default defineConfig({
  css: { preprocessorOptions: { scss: { api: 'modern-compiler' } } },
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    tailwindcss()
  ],
  server: {
    // Allow tunnel/proxy hostnames for local development.
    allowedHosts: true,
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8794',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
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
    exclude: ['@electric-sql/pglite', '@huggingface/transformers']
  },
  worker: {
    format: 'es'
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      onwarn(warning, warn) {
        if (isKnownPglitePackagingWarning(warning)) return
        warn(warning)
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@electric-sql/pglite')) return 'pglite'
          if (id.includes('@huggingface/transformers')) return 'transformers'
          if (id.includes('/vue') || id.includes('/pinia') || id.includes('/vue-router')) return 'vue-vendor'
          return 'vendor'
        }
      }
    }
  }
})
