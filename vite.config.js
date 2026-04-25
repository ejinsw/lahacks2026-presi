import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@mkkellogg/gaussian-splats-3d'],
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
  },
})
