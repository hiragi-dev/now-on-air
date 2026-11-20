import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getWorkId } from "../shared/platforms/dmm";
import { workKey } from "../shared/storage";
import {
  type WatchingAnime,
  CAPTURE_PORT_NAME,
  type CapturedEpisode,
  type ContentToSidePanelMessage,
  type GetTitleRequest,
  type GetTitleResponse,
  type SidePanelToContentMessage,
} from "../shared/types";

// 作品名の取得状態
// 取得できなかった場合は空文字にしてユーザーに入力してもらう
type TitleState = { kind: "loading" } | { kind: "ready"; value: string };

// 録画の状態
// Portは録画中だけ保持する
// 各話は話数の昇順で保持し差分の受信ごとに新しい配列に置換する
type CollectState =
  | { kind: "idle" }
  | {
    kind: "recording";
    port: chrome.runtime.Port;
    episodes: readonly CapturedEpisode[];
  }
  | { kind: "stopped"; episodes: readonly CapturedEpisode[] }
  // 解禁の開始日時と間隔を設定する
  // 保存は設定の確定時に実行する
  | {
      kind: "configuring";
      episodes: readonly CapturedEpisode[];
      startedAt: Date;
      // 画面では日数で指定する
      // 入力欄の文字列をそのまま保持し使用時に数値に変換する
      // 数値で保持すると空欄が0に変換され入力を削除できないため
      // 保存時に分に変換する
      intervalDays: string;
    };

// 解禁の間隔のデフォルトの日数
const DEFAULT_INTERVAL_DAYS = "7";

// 間隔の日数の入力が1以上の整数ならtrueを返す
// 空欄はNumberで0に変換されるので除外される
function isValidDays(input: string): boolean {
  const days = Number(input);
  return Number.isInteger(days) && days > 0;
}

// Dateをdatetime-localの入力欄の値に変換する
// 例：2026-11-16T00:00
// 入力欄はタイムゾーンを持たないのでローカル時刻で組み立てる
function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

// 解禁の開始日時のデフォルト
// 登録した日に1話を視聴できるように今日の0時にする
function defaultStartedAt(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

// エラー画面に表示するエラー
// stateにはデータだけを保持し表示はkindごとに切り替える
// エラーの種類が増えたらここに追加する
type SidePanelError =
  // chrome.storageへの保存の失敗
  // chrome.storageのエラーには種類を表すコードがないので原因は特定しない
  | { kind: "saveFailed"; message: string };

// エラーの種類ごとの表示
function ErrorView({ error }: { error: SidePanelError }) {
  switch (error.kind) {
    case "saveFailed":
      return (
        <div className="flex flex-col gap-2">
          <p>保存できませんでした</p>
          <p className="text-muted-foreground">
            タブを再読み込みしてからもう一度お試しください。保存領域が不足している可能性もあるので、改善しない場合は過去の作品を削除してください。
          </p>
          <p className="text-muted-foreground">エラー内容：{error.message}</p>
        </div>
      );
  }
}

// 対象タブがどのページか
type SidePanelState =
  | { kind: "loading" }
  | { kind: "notDetail" }
  // 一覧ページの作品が登録済みか確認中
  // 確認が完了したらregisteredかdetailに切り替える
  | { kind: "checking"; tabId: number; workId: string }
  // すでに登録してある作品の一覧ページ
  // 収集処理は不要なのでdetailとは区別する
  | { kind: "registered"; title: string }
  // 保存の完了画面
  // 確認ボタンを押すまではURLが変更されても表示を維持する
  | { kind: "saved"; title: string }
  // エラー画面
  // 戻るボタンを押すまではURLが変更されても表示を維持する
  | { kind: "error"; error: SidePanelError }
  // 作品名は録画の状態によらず一覧ページで常に表示するのでここで保持する
  // 作品が変わるとdetailごと再生成されるので古い作品名は残らない
  | {
    kind: "detail";
    tabId: number;
    workId: string;
    title: TitleState;
    collectState: CollectState;
  };

// タブのURLからページの状態を判定する
function judgeTab(tabId: number, url: string | undefined): SidePanelState {
  // isDetailUrlではなくgetWorkIdで一覧ページかを判定する
  // 一覧ページでもseasonがなければ作品IDを取得できず登録できないので
  // その場合もnullを返すgetWorkIdを使用する
  const workId = url ? getWorkId(url) : null;
  // 登録済みかはstorageの読み込みが必要で非同期になるので
  // ここでは確認中の状態を返しuseEffectで確認する
  if (workId) return { kind: "checking", tabId, workId };
  return { kind: "notDetail" };
}

// 収集した各話の一覧
function EpisodeList({ episodes }: { episodes: readonly CapturedEpisode[] }) {
  if (episodes.length === 0) {
    return <p className="text-muted-foreground">まだ見つかっていません</p>;
  }
  return (
    <ol className="flex flex-col gap-1">
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
      // 完了画面とエラー画面の表示中はURLが変更されても画面を変更しない
      // リスナーは登録時の状態しか参照できないので関数を渡して最新の状態で判定する
      const url = changeInfo.url;
      setState((prev) =>
        prev.kind === "saved" || prev.kind === "error"
          ? prev
          : judgeTab(tabId, url),
      );
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => chrome.tabs.onUpdated.removeListener(onUpdated);
  }, [targetTabId]);

  // 登録済みかを確認する作品のID
  const checkingWorkId = state.kind === "checking" ? state.workId : null;
  // 作品名を取得する作品のID
  // 未登録と確定してから取得する
  const workId = state.kind === "detail" ? state.workId : null;

  // 作品名を更新する
  // 一覧ページ以外の状態には作品名を追加しない
  function setTitle(title: TitleState) {
    setState((prev) => (prev.kind === "detail" ? { ...prev, title } : prev));
  }

  // 一覧ページを開いたら作品名を問い合わせる
  // 作品が変わったら古い問い合わせの応答は使用しない
  useEffect(() => {
    if (targetTabId === null || workId === null) return;
    let ignore = false;
    const request: GetTitleRequest = { type: "getTitle" };
    chrome.tabs
      .sendMessage<GetTitleRequest, GetTitleResponse>(targetTabId, request)
      .then((response) => {
        if (ignore) return;
        setTitle({ kind: "ready", value: response.title ?? "" });
      })
      // content scriptが読み込まれていない場合など
      .catch((error) => {
        console.error("[NowOnAir] 作品名を取得できませんでした", error);
        if (ignore) return;
        setTitle({ kind: "ready", value: "" });
      });
    return () => {
      ignore = true;
    };
  }, [targetTabId, workId]);

  // 録画中のPort
  const port =
    state.kind === "detail" && state.collectState.kind === "recording"
      ? state.collectState.port
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
        if (prev.kind !== "detail" || prev.collectState.kind !== "recording") {
          return prev;
        }
        // 結合で生成した新しい配列を並べ替えるので元の配列は変更しない
        const episodes = [...prev.collectState.episodes, ...message.episodes].sort(
          (a, b) => a.number - b.number,
        );
        return { ...prev, collectState: { ...prev.collectState, episodes } };
      });
    });

    // content script側から切断されたとき
    // ページの再読み込みなどで発生する
    // 収集した分は破棄して録画前の状態に戻す
    newPort.onDisconnect.addListener(() => {
      setState((prev) => {
        if (prev.kind !== "detail" || prev.collectState.kind !== "recording") {
          return prev;
        }
        return { ...prev, collectState: { kind: "idle" } };
      });
    });

    const message: SidePanelToContentMessage = { type: "captureStart", workId };
    newPort.postMessage(message);
    setState((prev) =>
      prev.kind === "detail"
        ? { ...prev, collectState: { kind: "recording", port: newPort, episodes: [] } }
        : prev,
    );
  }

  // 録画を停止する
  // Portの切断は状態の変化を受けてuseEffectで処理する
  function stopCapture(collect: Extract<CollectState, { kind: "recording" }>) {
    const message: SidePanelToContentMessage = { type: "captureEnd" };
    collect.port.postMessage(message);
    setState((prev) =>
      prev.kind === "detail"
        ? {
          ...prev,
          collectState: { kind: "stopped", episodes: collect.episodes },
        }
        : prev,
    );
  }

  // 収集した各話を確定して設定の画面に移動する
  function goToConfigure(
    collect: Extract<CollectState, { kind: "stopped" }>,
  ) {
    setState((prev) =>
      prev.kind === "detail"
        ? {
            ...prev,
            collectState: {
              kind: "configuring",
              episodes: collect.episodes,
              startedAt: defaultStartedAt(),
              intervalDays: DEFAULT_INTERVAL_DAYS,
            },
          }
        : prev,
    );
  }

  // 開始日時の入力を更新する
  // 入力欄を空にした場合は無視して直前の日時を保持する
  // datetime-localは入力欄を空にできるため
  function setStartedAt(value: string) {
    if (value === "") return;
    const startedAt = new Date(value);
    setState((prev) =>
      prev.kind === "detail" && prev.collectState.kind === "configuring"
        ? { ...prev, collectState: { ...prev.collectState, startedAt } }
        : prev,
    );
  }

  // 間隔の日数の入力を更新する
  // 設定の画面以外では更新しない
  function setIntervalDays(intervalDays: string) {
    setState((prev) =>
      prev.kind === "detail" && prev.collectState.kind === "configuring"
        ? { ...prev, collectState: { ...prev.collectState, intervalDays } }
        : prev,
    );
  }

  // 作品を保存する
  // 成功したら完了画面、失敗したらエラー画面に移動する
  async function save(
    workId: string,
    title: string,
    collect: Extract<CollectState, { kind: "configuring" }>,
  ) {
    const work: WatchingAnime = {
      v: 1,
      platform: "dmm",
      workId,
      title,
      episodes: [...collect.episodes],
      startedAt: collect.startedAt.toISOString(),
      intervalMinutes: Number(collect.intervalDays) * 24 * 60,
    };
    try {
      await chrome.storage.local.set({ [workKey(work.platform, workId)]: work });
      setState({ kind: "saved", title });
    } catch (error) {
      console.error("[NowOnAir] 保存できませんでした", error);
      const message = error instanceof Error ? error.message : String(error);
      setState({ kind: "error", error: { kind: "saveFailed", message } });
    }
  }

  // 完了画面とエラー画面から対象タブの今のページの画面に戻る
  // 表示中はURLの変更を無視しているのでURLを再取得して判定する
  async function backToTab() {
    if (targetTabId === null) return;
    try {
      const tab = await chrome.tabs.get(targetTabId);
      setState(judgeTab(targetTabId, tab.url));
    } catch {
      // 対象タブが閉じられた場合
      // サイドパネルの表示時と同じくアクティブなタブを対象に変更する
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined) {
        setState({ kind: "notDetail" });
        return;
      }
      setTargetTabId(tab.id);
      setState(judgeTab(tab.id, tab.url));
    }
  }

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1 className="font-semibold">NowOnAir</h1>
      {state.kind === "loading" && <p>読み込み中…</p>}
      {state.kind === "notDetail" && <p>作品の一覧ページで開いてください</p>}
      {state.kind === "saved" && (
        <div className="flex flex-col gap-2">
          <p>「{state.title}」を保存しました</p>
          <Button onClick={backToTab}>確認</Button>
        </div>
      )}
      {state.kind === "error" && (
        <div className="flex flex-col gap-2">
          <ErrorView error={state.error} />
          <Button variant="outline" onClick={backToTab}>
            戻る
          </Button>
        </div>
      )}
      {state.kind === "detail" && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">作品名</Label>
            {state.title.kind === "loading" ? (
              <p className="text-muted-foreground">取得中…</p>
            ) : (
              <Input
                id="title"
                type="text"
                value={state.title.value}
                placeholder="作品名を入力してください"
                onChange={(e) =>
                  setTitle({ kind: "ready", value: e.target.value })
                }
              />
            )}
          </div>
          {state.collectState.kind === "idle" && (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground">
                録画を開始してから、各話のタブを順に切り替えてください
              </p>
              <Button onClick={() => startCapture(state.tabId, state.workId)}>
                録画を開始
              </Button>
            </div>
          )}
          {state.collectState.kind === "recording" && (
            <div className="flex flex-col gap-2">
              <p>録画中：{state.collectState.episodes.length}話</p>
              <Button
                variant="outline"
                onClick={() =>
                  stopCapture(
                    state.collectState as Extract<CollectState, { kind: "recording" }>,
                  )
                }
              >
                停止
              </Button>
              <EpisodeList episodes={state.collectState.episodes} />
            </div>
          )}
          {state.collectState.kind === "stopped" && (
            <div className="flex flex-col gap-2">
              <p>{state.collectState.episodes.length}話を収集しました</p>
              <Button
                disabled={
                  state.title.kind !== "ready" || state.title.value.trim() === ""
                }
                onClick={() =>
                  goToConfigure(
                    state.collectState as Extract<CollectState, { kind: "stopped" }>,
                  )
                }
              >
                次へ
              </Button>
              <EpisodeList episodes={state.collectState.episodes} />
            </div>
          )}
          {state.collectState.kind === "configuring" && (
            <div className="flex flex-col gap-4">
              <p>{state.collectState.episodes.length}話を登録します</p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="startedAt">開始</Label>
                <Input
                  id="startedAt"
                  type="datetime-local"
                  value={toDateTimeLocalValue(state.collectState.startedAt)}
                  onChange={(e) => setStartedAt(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="intervalDays">間隔の日数</Label>
                <Input
                  id="intervalDays"
                  type="number"
                  min={1}
                  step={1}
                  value={state.collectState.intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                />
                {!isValidDays(state.collectState.intervalDays) && (
                  <p className="text-destructive">1以上の整数を入力してください</p>
                )}
              </div>
              <Button
                onClick={() => {
                  if (state.title.kind !== "ready") return;
                  save(
                    state.workId,
                    state.title.value.trim(),
                    state.collectState as Extract<CollectState, { kind: "configuring" }>,
                  );
                }}
                disabled={
                  !isValidDays(state.collectState.intervalDays) ||
                  state.title.kind !== "ready" ||
                  state.title.value.trim() === ""
                }
              >
                保存
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
