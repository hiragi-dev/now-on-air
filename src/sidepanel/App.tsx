import { useEffect, useState } from "react";
import { getWorkId } from "../shared/platforms/dmm";
import {
  CAPTURE_PORT_NAME,
  type CapturedEpisode,
  type ContentToSidePanelMessage,
  type SidePanelToContentMessage,
} from "../shared/types";

// 録画の状態
// Portは録画中だけ保持する
// 各話は話数の昇順で保持し差分の受信ごとに新しい配列に置換する
type CaptureState =
  | { kind: "idle" }
  | {
      kind: "recording";
      port: chrome.runtime.Port;
      episodes: readonly CapturedEpisode[];
    }
  // TODO: 停止時に保存する
  | { kind: "stopped"; episodes: readonly CapturedEpisode[] };

// 対象タブがどのページか
type SidePanelState =
  | { kind: "loading" }
  | { kind: "notDetail" }
  // すでに登録してある作品の一覧ページ
  // 収集処理は不要なのでdetailとは区別する
  | { kind: "registered"; title: string }
  | { kind: "detail"; tabId: number; workId: string; capture: CaptureState };

// タブのURLからページの状態を判定する
function judgeTab(tabId: number, url: string | undefined): SidePanelState {
  // isDetailUrlではなくgetWorkIdで一覧ページかを判定する
  // 一覧ページでもseasonがなければ作品IDを取得できず登録できないので
  // その場合もnullを返すgetWorkIdを使用する
  const workId = url ? getWorkId(url) : null;
  if (workId) {
    return { kind: "detail", tabId, workId, capture: { kind: "idle" } };
  }
  return { kind: "notDetail" };
}

// 収集した各話の一覧
function EpisodeList({ episodes }: { episodes: readonly CapturedEpisode[] }) {
  if (episodes.length === 0) return <p>まだ見つかっていません</p>;
  return (
    <ol style={{ listStyle: "none", padding: 0 }}>
      {episodes.map((episode) => (
        <li key={episode.id}>
          {episode.number}：{episode.label}
        </li>
      ))}
    </ol>
  );
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
      // 音声や読み込み状態の変化では録画の状態を維持する
      if (changeInfo.url === undefined) return;
      setState(judgeTab(tabId, changeInfo.url));
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => chrome.tabs.onUpdated.removeListener(onUpdated);
  }, [targetTabId]);

  // 録画中のPort
  const port =
    state.kind === "detail" && state.capture.kind === "recording"
      ? state.capture.port
      : null;

  // 録画中の状態から抜けたときにPortを切断する
  // URLの変更と停止とサイドパネルを閉じた場合をここで一括して処理する
  // 切断するとcontent script側で監視が停止する
  useEffect(() => {
    if (port === null) return;
    return () => port.disconnect();
  }, [port]);

  // 録画を開始する
  function startCapture(tabId: number, workId: string) {
    const newPort = chrome.tabs.connect(tabId, { name: CAPTURE_PORT_NAME });

    // 差分を受信したら話数の昇順で一覧に追加する
    // 録画中でなければ無視する
    newPort.onMessage.addListener((message: ContentToSidePanelMessage) => {
      setState((prev) => {
        if (prev.kind !== "detail" || prev.capture.kind !== "recording") {
          return prev;
        }
        // 結合で生成した新しい配列を並べ替えるので元の配列は変更しない
        const episodes = [...prev.capture.episodes, ...message.episodes].sort(
          (a, b) => a.number - b.number,
        );
        return { ...prev, capture: { ...prev.capture, episodes } };
      });
    });

    // content script側から切断されたとき
    // ページの再読み込みなどで発生する
    // 収集した分は破棄して録画前の状態に戻す
    newPort.onDisconnect.addListener(() => {
      setState((prev) => {
        if (prev.kind !== "detail" || prev.capture.kind !== "recording") {
          return prev;
        }
        return { ...prev, capture: { kind: "idle" } };
      });
    });

    const message: SidePanelToContentMessage = { type: "captureStart", workId };
    newPort.postMessage(message);
    setState((prev) =>
      prev.kind === "detail"
        ? { ...prev, capture: { kind: "recording", port: newPort, episodes: [] } }
        : prev,
    );
  }

  // 録画を停止する
  // Portの切断は状態の変化を受けてuseEffectで処理する
  function stopCapture(capture: Extract<CaptureState, { kind: "recording" }>) {
    const message: SidePanelToContentMessage = { type: "captureEnd" };
    capture.port.postMessage(message);
    setState((prev) =>
      prev.kind === "detail"
        ? {
            ...prev,
            capture: { kind: "stopped", episodes: capture.episodes },
          }
        : prev,
    );
  }

  return (
    <main style={{ padding: 12 }}>
      <h1 style={{ fontSize: 16, margin: 0 }}>NowOnAir</h1>
      {state.kind === "loading" && <p>読み込み中…</p>}
      {state.kind === "notDetail" && <p>作品の一覧ページで開いてください</p>}
      {state.kind === "detail" && (
        <>
          {state.capture.kind === "idle" && (
            <>
              <p>録画を開始してから、各話のタブを順に切り替えてください</p>
              <button onClick={() => startCapture(state.tabId, state.workId)}>
                録画を開始
              </button>
            </>
          )}
          {state.capture.kind === "recording" && (
            <>
              <p>録画中：{state.capture.episodes.length}話</p>
              <button onClick={() => stopCapture(state.capture as Extract<CaptureState, { kind: "recording" }>)}>
                停止
              </button>
              <EpisodeList episodes={state.capture.episodes} />
            </>
          )}
          {state.capture.kind === "stopped" && (
            <>
              <p>{state.capture.episodes.length}話を収集しました</p>
              <EpisodeList episodes={state.capture.episodes} />
            </>
          )}
        </>
      )}
    </main>
  );
}
