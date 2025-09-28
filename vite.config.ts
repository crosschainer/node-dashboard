import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 12000,
    cors: true,
    allowedHosts: ['work-1-tbqvutizulgfaqug.prod-runtime.all-hands.dev', 'localhost', '127.0.0.1'],
    headers: {
      'X-Frame-Options': 'ALLOWALL'
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 12000,
    cors: true,
    allowedHosts: ['work-1-tbqvutizulgfaqug.prod-runtime.all-hands.dev', 'localhost', '127.0.0.1'],
    headers: {
      'X-Frame-Options': 'ALLOWALL'
    }
  }
})