import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json" with { type: "json" };

export default defineManifest({
  manifest_version: 3,
  name: "NowOnAir",
  description: "昔のアニメをリアタイ化する拡張機能",
  version: pkg.version,
  action: {},
  // ポップアップを開いたタブのURLを取得するため
  // tabs権限では強い警告が表示されるのでactiveTabを使用する
  // アクションアイコンのクリック時にサイドパネルを表示するため
  permissions: ["activeTab", "storage", "sidePanel"],
  // サービスワーカーで対象サイトのタブのURLを取得するため
  host_permissions: ["https://tv.dmm.com/*"],
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  background: {
    service_worker: "src/background/main.ts",
    type: "module",
  },
  // Message Passingのasync利用のため、Chrome148以降を要求する
  // https://developer.chrome.com/docs/extensions/develop/concepts/messaging?hl=ja
  minimum_chrome_version: "148",
  
  content_scripts: [
    {
      matches: ["https://tv.dmm.com/*"],
      js: ["src/content/main.tsx"],
      run_at: "document_start"
    },
  ],
});
