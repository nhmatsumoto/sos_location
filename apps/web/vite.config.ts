import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Proxy /api para a API .NET em dev; em produção o Nginx faz esse papel.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // MapLibre is a single large module; other vendors are split below.
    chunkSizeWarningLimit: 1100,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: 'geospatial-vendor',
              test: /node_modules[\\/](?:maplibre-gl|@deck\.gl|@luma\.gl|@loaders\.gl|@math\.gl)[\\/]/,
              maxSize: 450 * 1024,
              priority: 20,
            },
            {
              name: 'vendor',
              test: /node_modules/,
              maxSize: 450 * 1024,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5080',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
