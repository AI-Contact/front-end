import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        // target: 'http://34.61.174.62',
        target: "http://localhost",
        changeOrigin: true,
        ws: true, // WebSocket 지원 활성화
      },
    },
  },
});
