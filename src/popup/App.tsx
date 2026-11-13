import { useEffect, useState } from "react";
import { getWorkId } from "../shared/platforms/dmm";
import type {
  PopupMessage,
  RegisterWorkError,
  RegisterWorkResponse,
} from "../shared/types";

// content scriptにメッセージを届けられなかったときのエラー
// ポップアップの中でしか起きないのでsharedには置かない
type SendError =
  | { type: "needsReload" }
  | { type: "unknown"; message: string; };

// 登録で起きうるエラー
// 送る途中で起きたものとcontent script側で起きたものの両方
type ScrapeError = SendError | RegisterWorkError;

// 作品を登録する処理がどこまで進んだか
type ScrapeState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; title: string; episodeCount: number }
  | { kind: "error"; error: ScrapeError };

// エラーの種類ごとにユーザーに見せる内容を変える
function ScrapeErrorView({ error }: { error: ScrapeError }) {
  switch (error.type) {
    case "needsReload":
      return <p>ページを再読み込みしてから、もう一度お試しください</p>;
    case "unknown":
      return <p>登録できませんでした：{error.message}</p>;
  }
}

// ポップアップを開いたタブがどのページか
// 一覧ページのときだけ登録する処理の状態を持つ
type PopupState =
  | { kind: "loading" }
  | { kind: "notDetail" }
  // すでに登録してある作品の一覧ページ
  // 集める処理はないのでdetailとは分ける
  | { kind: "registered"; title: string }
  | { kind: "detail"; tabId: number; workId: string; scrape: ScrapeState };

export default function App() {
  const [state, setState] = useState<PopupState>({ kind: "loading" });

  // ポップアップは開くたびに読み込み直されるので
  // 最初の表示がそのままポップアップを開いたときになる
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      // isDetailUrlではなくgetWorkIdで一覧ページかを判定する
      // 一覧ページでもseasonがなければ作品IDが取れず登録できないので
      // その場合もまとめてnullになるgetWorkIdを使う
      let workId = tab?.url ? getWorkId(tab.url) : null;

      // デバッグ用
      // GitHubのページでもボタンを出してメッセージの連携を試せるようにする
      // devのときだけ有効でbuildの成果物には入らない
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

  // 登録はcontent scriptに任せる
  // ポップアップは閉じると処理が止まるので保存まで向こうでやってもらう
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
      // content scriptが動いていないと受け取り手がいないというエラーになる
      // 拡張機能を更新したあと読み込み直していないタブで起きる
      // 文言はChromeが決めていて仕様では保証されていない
      // 変わった場合はunknownとしてそのまま表示される
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
