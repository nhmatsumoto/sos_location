import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

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
        '/api': {
          target: devApiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      tailwindcss(),
      react(),
      basicSsl(),
    ],
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        external: ['leaflet', 'react-leaflet'],
        output: {
          globals: {
            leaflet: 'L',
            'react-leaflet': 'ReactLeaflet',
          },
          manualChunks: {
            icons: ['lucide-react'],
            three: ['three'],
          },
        },
      },
    },
  }
})
