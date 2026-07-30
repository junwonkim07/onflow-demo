import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { seedDesignPlugin } from '@seed-design/vite-plugin'

export default defineConfig({
  // GitHub Pages 배포 시 DEPLOY_BASE=/onflow-demo/ (셸 경로 변환 이슈를 피하려고 env로 받는다)
  base: process.env.DEPLOY_BASE || '/',
  plugins: [react(), tailwindcss(), seedDesignPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'seed-design': path.resolve(__dirname, './seed-design'),
    },
  },
})
