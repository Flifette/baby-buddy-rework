import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  server: {
    host: "127.0.0.1",
    proxy: {
      "/api": "http://localhost:8099",
    },
  },
});
