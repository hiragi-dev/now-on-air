import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config.ts";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: {
    // 拡張機能のページや content script が dev server から HMR 用のモジュールを読めるようにする
    cors: { origin: [/chrome-extension:\/\//] },
  },
});
