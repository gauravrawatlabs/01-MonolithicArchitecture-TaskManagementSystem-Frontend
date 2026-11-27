/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// The backend's CORS policy and its email links (confirm-email, reset-password) both expect the
// frontend at http://localhost:3000, so the dev server and preview server must use exactly that port.
const FRONTEND_PORT = 3000;

export default defineConfig(({ command, mode }) => {
  // Fail the PRODUCTION build early if the API URL is missing, instead of shipping a broken app.
  if (command === 'build' && mode === 'production') {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    if (!env.VITE_API_BASE_URL) {
      throw new Error(
        'VITE_API_BASE_URL is not set for the production build. ' +
          'Set it as an environment variable, or copy .env.example to .env.production.local.',
      );
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: FRONTEND_PORT,
      strictPort: true, // fail instead of silently moving to 3001 (CORS would then block every API call)
    },
    preview: {
      port: FRONTEND_PORT,
      strictPort: true,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup/vitest.setup.ts'],
      include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      // Integration tests load real lazy pages; the first import of a heavy dependency (Recharts) can take
      // several seconds when many workers start at once. A test still ends as soon as it passes.
      testTimeout: 15_000,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/api/generated/**', 'src/main.tsx', 'src/vite-env.d.ts'],
        reporter: ['text', 'html'],
      },
    },
  };
});
