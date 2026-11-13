import { useEffect, useState } from "react";
import { getWorkId } from "../shared/platforms/dmm";
import type {
  PopupMessage,
  RegisterWorkError,
  RegisterWorkResponse,
} from "../shared/types";

// content scriptへのメッセージ送信に失敗したときのエラー
// ポップアップ内でのみ発生するのでsharedには配置しない
type SendError =
  | { type: "needsReload" }
  | { type: "unknown"; message: string; };

// 登録処理で発生しうるエラー
// 送信時に発生したものとcontent script側で発生したものの両方
type ScrapeError = SendError | RegisterWorkError;

// 作品の登録処理の進行状態
type ScrapeState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; title: string; episodeCount: number }
  | { kind: "error"; error: ScrapeError };

// エラーの種類ごとにユーザーに表示する内容を変更する
function ScrapeErrorView({ error }: { error: ScrapeError }) {
  switch (error.type) {
    case "needsReload":
      return <p>ページを再読み込みしてから、もう一度お試しください</p>;
    case "unknown":
      return <p>登録できませんでした：{error.message}</p>;
  }
}

// ポップアップを開いたタブがどのページか
// 一覧ページのときだけ登録処理の状態を保持する
type PopupState =
  | { kind: "loading" }
  | { kind: "notDetail" }
  // すでに登録してある作品の一覧ページ
  // 収集処理は不要なのでdetailとは区別する
  | { kind: "registered"; title: string }
  | { kind: "detail"; tabId: number; workId: string; scrape: ScrapeState };

export default function App() {
  const [state, setState] = useState<PopupState>({ kind: "loading" });

  // ポップアップは開くたびに再読み込みされるので
  // 初回のレンダリングがポップアップを開いた時点に対応する
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      // isDetailUrlではなくgetWorkIdで一覧ページかを判定する
      // 一覧ページでもseasonがなければ作品IDを取得できず登録できないので
      // その場合もnullを返すgetWorkIdを使用する
      let workId = tab?.url ? getWorkId(tab.url) : null;

      // デバッグ用
      // GitHubのページでもボタンを表示してメッセージ連携をテストできるようにする
      // devのときのみ有効でbuildの成果物には含まれない
      if (
        import.meta.env.DEV &&
        !workId &&
        tab?.url?.startsWith("https://github.com/")
      ) {
        workId = "debug";
      }
      if (tab?.id !== undefined && workId) {
        setState({
          kind: "detail",
          tabId: tab.id,
          workId,
          scrape: { kind: "idle" },
        });
      } else {
        setState({ kind: "notDetail" });
      }
    });
  }, []);

  // 登録処理はcontent scriptに委譲する
  // ポップアップは閉じると処理が中断されるので保存までcontent scriptで実行する
  async function registerWork(tabId: number, workId: string): Promise<void> {
    const setScrape = (scrape: ScrapeState) =>
      setState({ kind: "detail", tabId, workId, scrape });

    setScrape({ kind: "running" });
    try {
      const message: PopupMessage = { type: "registerWork" };
      const res: RegisterWorkResponse = await chrome.tabs.sendMessage(
        tabId,
        message,
      );
      if (res.ok) {
        setScrape({
          kind: "done",
          title: res.title,
          episodeCount: res.episodeCount,
        });
      } else {
        setScrape({ kind: "error", error: res.error });
      }
    } catch (e) {
      const message = String(e);
      // content scriptが実行されていないと受信側が存在しないというエラーが発生する
      // 拡張機能の更新後に再読み込みしていないタブで発生する
      // エラー文はChromeが定義していて仕様では保証されていない
      // 変更された場合はunknownとしてそのまま表示される
      if (message.includes("Receiving end does not exist")) {
        setScrape({ kind: "error", error: { type: "needsReload" } });
      } else {
        setScrape({ kind: "error", error: { type: "unknown", message } });
      }
    }
  }

  return (
    <main style={{ width: 240, padding: 12 }}>
      <h1 style={{ fontSize: 16, margin: 0 }}>NowOnAir</h1>
      {state.kind === "loading" && <p>読み込み中…</p>}
      {state.kind === "notDetail" && <p>作品の一覧ページで開いてください</p>}
      {state.kind === "detail" && (
        <>
          {state.scrape.kind === "idle" && (
            <button onClick={() => registerWork(state.tabId, state.workId)}>
              この作品をリアタイ化する
            </button>
          )}
          {state.scrape.kind === "running" && <p>登録中…</p>}
          {state.scrape.kind === "done" && (
            <p>
              「{state.scrape.title}」の{state.scrape.episodeCount}
              話を登録しました
            </p>
          )}
          {state.scrape.kind === "error" && (
            <ScrapeErrorView error={state.scrape.error} />
          )}
        </>
      )}
    </main>
  );
}
