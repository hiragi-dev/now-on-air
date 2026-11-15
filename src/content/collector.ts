import { findEpisodeLinks, getTabStartNumber } from "../shared/platforms/dmm";
import {
  CAPTURE_PORT_NAME,
  type CapturedEpisode,
  type ContentToSidePanelMessage,
  type SidePanelToContentMessage,
} from "../shared/types";

// 現在接続しているサイドパネルとのPort
let currentPort: chrome.runtime.Port | null = null;
// 録画中の監視
// 自分からdisconnectしたときはonDisconnectが発火しないので
// 新しい接続の受信時に停止できるようにグローバルで保持する
let observer: MutationObserver | null = null;

// 録画中の監視を停止する
function stopObserver() {
  observer?.disconnect();
  observer = null;
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== CAPTURE_PORT_NAME) return;

  // 新しい接続を優先して古い接続を切断する
  // 古い接続の録画は停止し収集した分は破棄する
  stopObserver();
  currentPort?.disconnect();
  currentPort = port;

  // この接続の録画で収集したID
  // 接続ごとに保持し切断時に破棄する
  const collectedIds = new Set<string>();

  // 要素とその子孫から各話を検索し未収集のものだけをサイドパネルに送信する
  // 話数は選択中のタブの起点にページ内の各話リンクでの順番を加算して計算する
  // 追加された要素の中だけで数えるとスクロールで追加された分が先頭から数え直されるため
  // ページ全体の各話リンクは呼び出しごとに1回だけ列挙する
  function collectFrom(root: Element, workId: string, startNumber: number) {
    // 作品の一覧はダイアログとして表示される
    // ダイアログの背後に元のページのリンクが残るので順番の計算はダイアログ内に限定する
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog === null) {
      console.error("[NowOnAir] 作品の一覧のダイアログが見つかりません");
      return;
    }
    const pageIds = findEpisodeLinks(dialog, workId).map((l) => l.id);
    const newEpisodes: CapturedEpisode[] = [];
    for (const link of findEpisodeLinks(root, workId)) {
      if (collectedIds.has(link.id)) continue;
      const index = pageIds.indexOf(link.id);
      // ダイアログ外のリンクや削除済みの要素は順番を特定できないので収集しない
      if (index === -1) continue;
      collectedIds.add(link.id);
      newEpisodes.push({ ...link, number: startNumber + index });
    }
    if (newEpisodes.length === 0) return;
    const message: ContentToSidePanelMessage = {
      type: "diff",
      episodes: newEpisodes,
    };
    port.postMessage(message);
  }

  port.onMessage.addListener((message: SidePanelToContentMessage) => {
    switch (message.type) {
      case "captureStart": {
        // 録画中に再度開始された場合は後の開始を優先して最初から実行する
        stopObserver();
        collectedIds.clear();

        const { workId } = message;
        // 録画開始時点で表示済みのリンクは追加として通知されないので一度収集する
        collectFrom(document.body, workId, getTabStartNumber());

        // 追加された要素だけを検索する
        // タブの切り替え後に残る古いリンクを重複して処理しないため
        observer = new MutationObserver((records) => {
          for (const record of records) {
            for (const node of record.addedNodes) {
              if (node instanceof Element) {
                collectFrom(node, workId, getTabStartNumber());
              }
            }
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        break;
      }
      case "captureEnd":
        stopObserver();
        break;
    }
  });

  // サイドパネル側から切断されたとき
  // サイドパネルを閉じた場合も発火する
  port.onDisconnect.addListener(() => {
    // 新しい接続に置換済みなら新しい接続の監視を停止しない
    if (currentPort !== port) return;
    stopObserver();
    currentPort = null;
  });
});
