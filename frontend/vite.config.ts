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
  plugins: [vue(), vueJsx(), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '#api': resolve(__dirname, '../api/src')
    }
  },
  server: {
    // Allow all proxied / tunnelled hosts (e.g. Manus sandbox, ngrok, Cloudflare Tunnel)
    allowedHosts: true,
    host: '0.0.0.0',
    port: 5173
  }
})
