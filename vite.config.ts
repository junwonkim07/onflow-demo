import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { seedDesignPlugin } from '@seed-design/vite-plugin'

export default defineConfig({
  // GitHub Pages 배포: GHPAGES=1 npm run build
  // (경로를 셸로 넘기면 Git Bash MSYS가 /onflow-demo/를 C:/Program Files/...로 변환하므로, 값 없는 플래그만 받는다)
  base: process.env.GHPAGES ? '/onflow-demo/' : '/',
  plugins: [react(), tailwindcss(), seedDesignPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'seed-design': path.resolve(__dirname, './seed-design'),
    },
  },
})
