/// <reference types="vitest" />
import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import tailwindcss from '@tailwindcss/vite'
import compression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devApiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:8001'
  const isProd = mode === 'production'

  return {
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
    },
    server: {
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      isProd && compression({
        algorithm: 'brotliCompress',
        ext: '.br',
      }),
      isProd && compression({
        algorithm: 'gzip',
        ext: '.gz',
      }),
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean) as PluginOption[],
    build: {
      chunkSizeWarningLimit: 1200,
      minify: 'esbuild',
      cssMinify: true,
      sourcemap: false,
      reportCompressedSize: false, // Speed up build by skipping compression reporting in logs
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // three.js has NO React dependency — safe to isolate
              if (id.includes('/three/')) {
                return 'three';
              }
              // lucide-react is also safe to isolate (no hooks)
              if (id.includes('lucide-react')) {
                return 'icons';
              }
              // Everything else (react, react-dom, chakra, leaflet, @react-three, etc.)
              // stays together in 'vendor' to guarantee a SINGLE React instance.
              // Splitting React-dependent libs into separate chunks duplicates React
              // and causes "Cannot read properties of undefined (reading 'useLayoutEffect')".
              return 'vendor';
            }
          },
        },
      },
    },
  }
})
