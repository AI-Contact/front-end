import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://35.232.109.3',
        changeOrigin: true,
      },
      // 2. AI 서버 스트리밍 (포트 5000)
      '/video_feed': {
        target: 'http://localhost:5000', // 로컬에서 실행 시 localhost, 서버에 올리면 서버 IP
        changeOrigin: true,
      },

      // 3. AI 서버 API (포트 5000)
      '/ai-api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai-api/, '/api')
      }
    }
  }
})
