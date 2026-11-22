import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json" with { type: "json" };

export default defineManifest({
  manifest_version: 3,
  name: "NowOnAir",
  description: "昔のアニメをリアタイ化する拡張機能",
  version: pkg.version,
  action: {},
  // アクションアイコンのクリック時にサイドパネルを表示するため
  permissions: ["storage", "sidePanel"],
  // サービスワーカーで対象サイトのタブのURLを取得するため
  host_permissions: ["https://tv.dmm.com/*"],
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  // 管理ページ
  // 拡張機能のメニューのオプションから開けるようにオプションページとして登録する
  // 一覧を広く表示するため新しいタブで開く
  options_ui: {
    page: "src/manager/index.html",
    open_in_tab: true,
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
