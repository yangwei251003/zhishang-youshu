import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()], base: './', build: { outDir:'dist-v4' },
  server: {
    host: '127.0.0.1', port: 5192, strictPort: true,
    // Playwright traces contain HTML. They must not reload the app under test.
    watch: { ignored: ['**/artifacts/**', '**/docs/**', '**/video-production/**', '**/playwright-report/**', '**/test-results/**'] },
  },
  preview: { host: '127.0.0.1', port: 5192, strictPort: true },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
