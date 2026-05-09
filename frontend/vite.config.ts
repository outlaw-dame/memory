import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'
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
    tailwindcss(),
    VitePWA({
      // Registration is handled manually in main.ts — don't inject a script.
      injectRegister: null,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // In dev, the SW is skipped to avoid intercepting HMR traffic.
      devOptions: { enabled: false },
      injectManifest: {
        // Vite-plugin-pwa replaces this token in src/sw.ts with the build manifest.
        injectionPoint: '__WB_MANIFEST',
        // Bundle the SW with Rollup so TypeScript + imports resolve correctly.
        rollupFormat: 'es',
        // PGlite and transformers.js ship multi-MB WASM + data blobs that must
        // NOT be precached — they're served stale-while-revalidate on demand.
        globIgnores: [
          '**/*.wasm',
          '**/*.data',
          '**/pglite*.js',
          '**/pglite.worker*.js',
          '**/transformers*.js',
        ],
      },
      manifest: {
        id: '/',
        name: 'memory.',
        short_name: 'memory',
        description: 'A federated social client for ActivityPub and ATProto.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'browser'],
        background_color: '#edead7',
        theme_color: '#6364f6',
        categories: ['social', 'productivity'],
        icons: [
          { src: '/favicon.ico',           sizes: '16x16 24x24 32x32 48x48 64x64', type: 'image/x-icon' },
          { src: '/pwa-192x192.png',        sizes: '192x192',  type: 'image/png' },
          { src: '/pwa-512x512.png',        sizes: '512x512',  type: 'image/png' },
          { src: '/pwa-512x512.png',        sizes: '512x512',  type: 'image/png', purpose: 'maskable' },
          { src: '/apple-touch-icon.png',   sizes: '180x180',  type: 'image/png' },
        ],
      },
    }),
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
      '#api': resolve(__dirname, '../api/src'),
      // Bypass ionicons exports map so ?raw SVG imports resolve to actual files
      'ionicons/dist/svg': resolve(__dirname, 'node_modules/ionicons/dist/svg'),
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
