import { useEffect, useState } from "react";
import { getWorkId } from "../shared/platforms/dmm";
import type {
  SidePanelMessage,
  RegisterWorkError,
  RegisterWorkResponse,
} from "../shared/types";

// content scriptへのメッセージ送信に失敗したときのエラー
// サイドパネル内でのみ発生するのでsharedには配置しない
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

// 対象タブがどのページか
// 一覧ページのときだけ登録処理の状態を保持する
type SidePanelState =
  | { kind: "loading" }
  | { kind: "notDetail" }
  // すでに登録してある作品の一覧ページ
  // 収集処理は不要なのでdetailとは区別する
  | { kind: "registered"; title: string }
  | { kind: "detail"; tabId: number; workId: string; scrape: ScrapeState };

// タブのURLからページの状態を判定する
function judgeTab(tabId: number, url: string | undefined): SidePanelState {
  // isDetailUrlではなくgetWorkIdで一覧ページかを判定する
  // 一覧ページでもseasonがなければ作品IDを取得できず登録できないので
  // その場合もnullを返すgetWorkIdを使用する
  const workId = url ? getWorkId(url) : null;
  if (workId) {
    return { kind: "detail", tabId, workId, scrape: { kind: "idle" } };
  }
  return { kind: "notDetail" };
}

export default function App() {
  const [state, setState] = useState<SidePanelState>({ kind: "loading" });
  // サイドパネルの対象タブのID
  // サイドパネルを表示した時点のアクティブなタブを対象とする
  const [targetTabId, setTargetTabId] = useState<number | null>(null);

  // サイドパネルの表示時に対象タブを取得する
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id === undefined) {
        setState({ kind: "notDetail" });
        return;
      }
      setTargetTabId(tab.id);
      setState(judgeTab(tab.id, tab.url));
    });
  }, []);

  // 対象タブのURL変更を監視して判定を再実行する
  // サイドパネルはページ遷移後も表示を継続するため
  useEffect(() => {
    if (targetTabId === null) return;

    const onUpdated = (
      tabId: number,
      changeInfo: chrome.tabs.OnUpdatedInfo,
    ) => {
      // onUpdatedは全タブの更新で発火するので対象タブ以外は無視する
      if (tabId !== targetTabId) return;
      // URLが変更されたときだけ判定する
      // 音声や読み込み状態の変化では登録処理の状態を維持する
      if (changeInfo.url === undefined) return;
      setState(judgeTab(tabId, changeInfo.url));
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => chrome.tabs.onUpdated.removeListener(onUpdated);
  }, [targetTabId]);

  // 登録処理はcontent scriptに委譲する
  // 保存までcontent scriptで実行する
  async function registerWork(tabId: number, workId: string): Promise<void> {
    const setScrape = (scrape: ScrapeState) =>
      setState({ kind: "detail", tabId, workId, scrape });

    setScrape({ kind: "running" });
    try {
      const message: SidePanelMessage = { type: "registerWork", workId };
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
    <main style={{ padding: 12 }}>
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
