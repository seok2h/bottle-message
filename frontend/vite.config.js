import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 서버 설정
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 가상/네트워크 드라이브에서도 파일 변경을 확실히 감지하도록 polling 사용
    watch: { usePolling: true },
    // 개발 중 /api 요청을 백엔드(4000)로 프록시 → CORS 신경 안 써도 됨
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
