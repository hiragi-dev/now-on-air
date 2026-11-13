import { useEffect, useState } from "react";
import { getWorkId } from "../shared/platforms/dmm";

// 話のIDを集める処理がどこまで進んだか
type ScrapeState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; episodeIds: string[] }
  | { kind: "error"; message: string };

// ポップアップを開いたタブがどのページか
// 一覧ページのときだけ集める処理の状態を持つ
type PopupState =
  | { kind: "loading" }
  | { kind: "notDetail" }
  | { kind: "detail"; workId: string; scrape: ScrapeState };

export default function App() {
  const [state, setState] = useState<PopupState>({ kind: "loading" });

  // ポップアップは開くたびに読み込み直されるので
  // 最初の表示がそのままポップアップを開いたときになる
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      const workId = tab?.url ? getWorkId(tab.url) : null;
      if (workId) {
        setState({ kind: "detail", workId, scrape: { kind: "idle" } });
      } else {
        setState({ kind: "notDetail" });
      }
    });
  }, []);

  return (
    <main style={{ width: 240, padding: 12 }}>
      <h1 style={{ fontSize: 16, margin: 0 }}>NowOnAir</h1>
      {state.kind === "loading" && <p>読み込み中…</p>}
      {state.kind === "notDetail" && <p>作品の一覧ページで開いてください</p>}
      {state.kind === "detail" && (
        // TODO: 押したときにcontent scriptへ話のIDを集めるよう頼む
        <button>この作品をリアタイ化する</button>
      )}
    </main>
  );
}
