import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves this project repo from /gym-app/.
  base: '/gym-app/',
  plugins: [react(), tailwindcss()],
})
