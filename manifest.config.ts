import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json" with { type: "json" };

export default defineManifest({
  manifest_version: 3,
  name: "NowOnAir",
  description: "昔のアニメをリアタイ化する拡張機能",
  version: pkg.version,
  action: {
    default_popup: "src/popup/index.html",
  },
  content_scripts: [
    {
      matches: ["https://tv.dmm.com/*", "https://github.com/*"],
      js: ["src/content/main.ts"],
    },
  ],
});
