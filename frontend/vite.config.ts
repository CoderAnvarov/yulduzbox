import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Cloudflare tunnel domenlariga ruxsat (faqat ishlab chiqish uchun)
    allowedHosts: [".trycloudflare.com"],
    // /api so'rovlari backendga yo'naltiriladi (CORS muammosi bo'lmaydi)
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
