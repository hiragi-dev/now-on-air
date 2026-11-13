import { createRoot, type Root } from "react-dom/client";
import { BlockedOverlay } from "./components/BlockedOverlay";
import { isPlaybackUrl } from "../shared/platforms/dmm";
import type { PopupMessage, RegisterWorkResponse } from "../shared/types";

console.log("[NowOnAir] content script loaded:", location.href);

// 再生ページのうちブロック対象のURLならtrueを返す
function isBlockedUrl(url: string): boolean {
  if (!isPlaybackUrl(url)) return false;

  // TODO: ブロック対象のURLの一覧と照合する
  // 一覧をどこにどう持つかは未決定なので今は再生ページすべてを対象にする
  return true;
}

function pauseOnPlay(ev: Event): void {
  (ev.target as HTMLVideoElement).pause();
}

function attachToVideo(video: HTMLVideoElement): void {
  if (!video.paused) video.pause();
  video.addEventListener("play", pauseOnPlay);
}

// Reactで描画したブロック画面
// 消すときにunmountとremoveの両方が必要なので土台のdivとrootを一緒に持つ
type BlockedOverlayHandle = {
  container: HTMLDivElement;
  root: Root;
};

// コンテンツをブロックしたことを示す画面を全体に表示する
// 作ったものを返す
function showBlockedOverlay(): BlockedOverlayHandle {
  // bodyを土台にするとサイトの中身がReactに消されるので専用のdivを作る
  const container = document.createElement("div");
  document.body.append(container);

  const root = createRoot(container);
  root.render(<BlockedOverlay />);
  return { container, root };
}

function hideBlockedOverlay(handle: BlockedOverlayHandle): void {
  handle.root.unmount();
  handle.container.remove();
}

// videoが見つかれば停止処理を付けてtrueを返す
function findVideo(): boolean {
  const video = document.querySelector("video");
  if (!video) return false;
  attachToVideo(video);
  return true;
}

// videoの追加を監視するMutationObserver
// なければnull
let videoObserver: MutationObserver | null = null;

// 今表示しているブロック画面
// なければnull
let blockedOverlay: BlockedOverlayHandle | null = null;

function stopWatchingForVideo(): void {
  videoObserver?.disconnect();
  videoObserver = null;
}

function startWatchingForVideo(): void {
  // 監視を始める時点ですでにあるvideo
  findVideo();

  // プレイヤーがvideoを作り直すことがあるので見つけたあとも監視を続ける
  // 監視をやめるのはページを移動したとき
  videoObserver = new MutationObserver(() => {
    findVideo();
  });
  videoObserver.observe(document.body, { childList: true, subtree: true });
}

// ブロック対象のページならブロック画面を出してvideoを止める
// ページ読み込みとSPA内の遷移の両方がここを通る
function blockIfNeeded(): void {
  if (!isBlockedUrl(location.href)) return;

  // videoの読み込みを待機せずにブロック画面を表示する
  blockedOverlay = showBlockedOverlay();
  startWatchingForVideo();
}

// SPA内の遷移
// 前のページの監視とブロック画面が残っていれば片付けてから始め直す
window.navigation.addEventListener("currententrychange", () => {
  console.log("[NowOnAir] navigated:", location.href);
  stopWatchingForVideo();

  // SPAは拡張機能が追加した要素を知らないので自分で消す
  if (blockedOverlay) hideBlockedOverlay(blockedOverlay);
  blockedOverlay = null;

  blockIfNeeded();
});

// 直接アクセスやリロードでページが読み込まれたとき
blockIfNeeded();

// ポップアップからのメッセージ
// asyncにしてPromiseを返すと解決した値が応答として送信される
chrome.runtime.onMessage.addListener(
  async (message: PopupMessage, sender): Promise<RegisterWorkResponse> => {
    console.log("[NowOnAir] message received:", message, sender);

    // TODO: 登録の処理を作ったら差し替える
    // 今はポップアップが応答を受信できるかを確認するための仮の値
    return { ok: true, title: "仮", episodeCount: 0 };
  },
);
