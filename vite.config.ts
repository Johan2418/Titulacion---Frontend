/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * El backend publica sus rutas en la raíz (`/auth/login`, `/periodos`…) y emite la cookie de
 * renovación con `Path=/auth`. El proxy quita el prefijo `/api/v1` y reescribe esa ruta para
 * que el navegador la envíe a `/api/v1/auth/*`. El backend valida el `Origin`, que debe figurar
 * en su `AUTH_ORIGINS` (por defecto incluye http://localhost:5173).
 */
function proxyBackend(destino: string): Record<string, ProxyOptions> {
  return {
    '/api/v1': {
      target: destino,
      changeOrigin: true,
      rewrite: (ruta) => ruta.replace(/^\/api\/v1/, '') || '/',
      cookiePathRewrite: { '/auth': '/api/v1/auth' },
    },
  }
}

export default defineConfig(({ mode }) => {
  const backend = loadEnv(mode, process.cwd(), '').VITE_BACKEND_URL || 'http://127.0.0.1:3000'
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: { port: 5173, proxy: proxyBackend(backend) },
    preview: { proxy: proxyBackend(backend) },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router'],
            datos: [
              '@tanstack/react-query',
              '@tanstack/react-table',
              'zod',
              'react-hook-form',
              '@hookform/resolvers',
            ],
            ui: [
              '@radix-ui/react-dialog',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-progress',
              'sonner',
            ],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      env: { VITE_TIMEZONE: 'America/Guayaquil' },
    },
  }
})
