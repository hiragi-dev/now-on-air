import { getTitle } from "../shared/platforms/dmm";
import type { GetTitleRequest, GetTitleResponse } from "../shared/types";

// 作品名が見つかるまで待つ上限
const TIMEOUT_MS = 10_000;

// 作品名が表示されるまで待って返す
// URLの遷移直後は一覧のダイアログがまだ描画されていないため
// bodyの変化のたびに取得を試す
// 上限を過ぎたらnull
function waitForTitle(): Promise<string | null> {
  return new Promise((resolve) => {
    const title = getTitle();
    if (title) {
      resolve(title);
      return;
    }
    const observer = new MutationObserver(() => {
      const title = getTitle();
      if (!title) return;
      finish(title);
    });
    const timer = setTimeout(() => finish(null), TIMEOUT_MS);
    function finish(title: string | null) {
      observer.disconnect();
      clearTimeout(timer);
      resolve(title);
    }
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

// サイドパネルからの作品名の問い合わせに答える
chrome.runtime.onMessage.addListener(
  (message: GetTitleRequest, _sender, sendResponse) => {
    if (message.type !== "getTitle") return;
    waitForTitle().then((title) => {
      const response: GetTitleResponse = { title };
      sendResponse(response);
    });
    // 非同期でsendResponseを呼ぶことをChromeに伝える
    return true;
  },
);
