import { useEffect, useRef, useState } from "react";
import { getWorkId } from "../shared/platforms/dmm";
import {
  CAPTURE_PORT_NAME,
  type ContentToSidePanelMessage,
  type SidePanelToContentMessage,
} from "../shared/types";

// デバッグ用
// 録画の開始と停止を送信し受信した差分をコンソールに出力する
// 録画UIを実装したら削除する
function DebugCapture({ tabId, workId }: { tabId: number; workId: string }) {
  const portRef = useRef<chrome.runtime.Port | null>(null);

  function send(message: SidePanelToContentMessage) {
    if (portRef.current === null) {
      const port = chrome.tabs.connect(tabId, { name: CAPTURE_PORT_NAME });
      port.onMessage.addListener((m: ContentToSidePanelMessage) => {
        console.log("[NowOnAir] received", m);
      });
      port.onDisconnect.addListener(() => {
        console.log("[NowOnAir] disconnected", chrome.runtime.lastError);
        portRef.current = null;
      });
      portRef.current = port;
    }
    portRef.current.postMessage(message);
  }

  return (
    <div>
      <button onClick={() => send({ type: "captureStart", workId })}>
        開始
      </button>
      <button onClick={() => send({ type: "captureEnd" })}>停止</button>
    </div>
  );
}

// 対象タブがどのページか
type SidePanelState =
  | { kind: "loading" }
  | { kind: "notDetail" }
  // すでに登録してある作品の一覧ページ
  // 収集処理は不要なのでdetailとは区別する
  | { kind: "registered"; title: string }
  | { kind: "detail"; tabId: number; workId: string };

// タブのURLからページの状態を判定する
function judgeTab(tabId: number, url: string | undefined): SidePanelState {
  // isDetailUrlではなくgetWorkIdで一覧ページかを判定する
  // 一覧ページでもseasonがなければ作品IDを取得できず登録できないので
  // その場合もnullを返すgetWorkIdを使用する
  const workId = url ? getWorkId(url) : null;
  if (workId) {
    return { kind: "detail", tabId, workId };
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
      if (changeInfo.url === undefined) return;
      setState(judgeTab(tabId, changeInfo.url));
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => chrome.tabs.onUpdated.removeListener(onUpdated);
  }, [targetTabId]);

  return (
    <main style={{ padding: 12 }}>
      <h1 style={{ fontSize: 16, margin: 0 }}>NowOnAir</h1>
      {state.kind === "loading" && <p>読み込み中…</p>}
      {state.kind === "notDetail" && <p>作品の一覧ページで開いてください</p>}
      {/* TODO: 録画ボタンと収集した各話の表示を実装する */}
      {state.kind === "detail" && (
        <>
          <p>作品ID：{state.workId}</p>
          <DebugCapture tabId={state.tabId} workId={state.workId} />
        </>
      )}
    </main>
  );
}
