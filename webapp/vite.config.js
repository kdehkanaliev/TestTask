import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Telegram Mini App (Web App) uchun React build konfiguratsiyasi.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // telefon/emulator orqali tarmoqdagi manzilga kirish uchun
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
});