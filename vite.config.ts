import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 12000,
    cors: true,
    allowedHosts: ['all', 'work-1-rsywrpmgxzxvlepw.prod-runtime.all-hands.dev'],
    headers: {
      'X-Frame-Options': 'ALLOWALL'
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 12000,
    cors: true,
    allowedHosts: ['all'],
    headers: {
      'X-Frame-Options': 'ALLOWALL'
    }
  }
})