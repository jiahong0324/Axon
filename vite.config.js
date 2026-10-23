import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { historyApiFallback: true },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react'
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion'
            }
            if (id.includes('jspdf') || id.includes('jspdf-autotable') || id.includes('jszip') || id.includes('file-saver')) {
              return 'vendor-export'
            }
            if (id.includes('katex')) {
              return 'vendor-katex'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            if (id.includes('@datadog')) {
              return 'vendor-monitoring'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            if (id.includes('date-fns')) {
              return 'vendor-date'
            }
          }
        }
      }
    }
  }
})
