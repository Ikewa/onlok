import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Dev only. The API host is derived from VITE_API_URL so the proxy can never
  // point at a different backend than the app talks to.
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL || 'http://localhost:5000'

  return {
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // tus sends PATCH bodies as a raw byte stream and relies on exact
      // Upload-Offset semantics, so the route is proxied verbatim with no body
      // parsing or header rewriting. It also makes relative tus Location
      // headers work, since they then resolve against the Vite origin.
      '/api/verifications/upload/tus': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../backend/client-dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'mui-vendor';
            }
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }
          }
        }
      }
    }
  }
  }
})
