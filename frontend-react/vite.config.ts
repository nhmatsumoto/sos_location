import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devApiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:8001'

  return {
    resolve: {
      alias: {
        'react-router-dom': '/src/lib/react-router-dom.tsx',
      },
    },
    server: {
      proxy: {
        '/api/v1/urban': {
          target: env.VITE_DEV_GIS_TARGET || 'http://localhost:8002',
          changeOrigin: true,
        },
        '/api/v1/terrain': {
          target: env.VITE_DEV_GIS_TARGET || 'http://localhost:8002',
          changeOrigin: true,
        },
        '/api/v1/alerts': {
          target: env.VITE_DEV_GIS_TARGET || 'http://localhost:8002',
          changeOrigin: true,
        },
        '/api': {
          target: devApiTarget,
          changeOrigin: true,
        },
      },
    },
    plugins: [
      tailwindcss(),
      react(),
    ],
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            leaflet: ['leaflet', 'react-leaflet'],
            icons: ['lucide-react'],
            three: ['three'],
          },
        },
      },
    },
  }
})
