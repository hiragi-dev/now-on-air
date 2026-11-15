import { isSupportedUrl } from "../shared/platforms/lib";

// アクションアイコンのクリック時にサイドパネルを表示する
// サービスワーカーの起動ごとに実行する
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => {
    console.error("サイドパネルの設定に失敗しました", error);
  });

// 全タブ共通のサイドパネルを無効化する
// 対象サイトのタブだけ個別に有効化する
chrome.sidePanel.setOptions({ enabled: false }).catch((error) => {
  console.error("サイドパネルの無効化に失敗しました", error);
});

// タブごとにサイドパネルの有効と無効を設定する
function setSidePanelEnabled(tabId: number, enabled: boolean) {
  chrome.sidePanel
    .setOptions({ tabId, enabled, path: "src/sidepanel/index.html" })
    .catch((error) => {
      console.error("サイドパネルの設定変更に失敗しました", error);
    });
}

// タブの更新ごとに対象サイトか判定する
chrome.tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
  // 権限のないサイトではURLを取得できない
  // 対象外のサイトとして無効化する
  if (tab.url === undefined) {
    setSidePanelEnabled(tabId, false);
    return;
  }

  const url = URL.parse(tab.url);
  if (url === null) {
    console.error("タブのURLの解析に失敗しました", tab.url);
    setSidePanelEnabled(tabId, false);
    return;
  }

  setSidePanelEnabled(tabId, isSupportedUrl(url));
});
