import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import manifest from "./manifest.config.ts";

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    // shadcn/uiが@/components/...の形でimportするため
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  server: {
    // 拡張機能のページや content script が dev server から HMR 用のモジュールを読めるようにする
    cors: { origin: [/chrome-extension:\/\//] },
  },
});
