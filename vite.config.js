import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/deployment1.github.io/',
  server: {
    allowedHosts: ['clemmie-unsurfeited-contactually.ngrok-free.dev'],
  },
})
