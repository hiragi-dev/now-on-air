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
  // ポップアップを開いたタブのURLを読むため
  // tabs権限だと強い警告が出るのでactiveTabにする
  permissions: ["activeTab", "storage"],
  // Message Passingのasync利用のため、Chrome148以降を要求する
  // https://developer.chrome.com/docs/extensions/develop/concepts/messaging?hl=ja
  minimum_chrome_version: "148",
  
  content_scripts: [
    {
      matches: ["https://tv.dmm.com/*", "https://github.com/*"],
      js: ["src/content/main.tsx"],
      run_at: "document_start"
    },
  ],
});
