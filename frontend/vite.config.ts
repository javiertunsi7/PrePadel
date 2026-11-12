import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // PWA: la app se instala en el móvil y abre sin cobertura (el service worker
    // guarda la aplicación; los datos los guarda src/lib/store.tsx).
    mode !== 'test' &&
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'PrePádel',
          short_name: 'PrePádel',
          description: 'Rutinas cortas de codo, hombro y rodilla para jugar al pádel sin lesiones.',
          lang: 'es',
          start_url: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#fff7ea',
          theme_color: '#fff7ea',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          // Recibe el aviso del partido con la app cerrada (public/push-sw.js).
          importScripts: ['push-sw.js'],
        },
      }),
  ],
  server: {
    port: 5173,
    // En desarrollo el frontend habla con el backend de Spring Boot por el mismo origen.
    proxy: { '/api': 'http://localhost:8080' },
    // Solo en los tests: uno de ellos lee el catálogo de ejercicios del backend
    // (../backend) para comprobar que cada ejercicio tiene su ilustración.
    fs: mode === 'test' ? { allow: ['..'] } : undefined,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
}));
