console.log("[NowOnAir] content script loaded:", location.href);
export {};

function isPlaybackUrl(url: string): boolean {
  return url.includes("playback");
}

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

// videoが見つかれば停止処理を付けてtrueを返す
function findVideo(): boolean {
  const video = document.querySelector("video");
  if (!video) return false;
  attachToVideo(video);
  return true;
}

// 今動いているMutationObserver
// なければnull
let observer: MutationObserver | null = null;

function stopWatching(): void {
  observer?.disconnect();
  observer = null;
}

function startWatching(): void {
  if (!isBlockedUrl(location.href)) return;

  // 監視を始める時点ですでにvideoがある場合
  if (findVideo()) return;

  // videoが現れるまで監視する
  // 見つかったら監視をやめる
  observer = new MutationObserver(() => {
    if (findVideo()) stopWatching();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// SPA内の遷移
// 前のページの監視が残っていれば片付けてから始め直す
window.navigation.addEventListener("currententrychange", () => {
  console.log("[NowOnAir] navigated:", location.href);
  stopWatching();
  startWatching();
});

// 直接アクセスやリロードでページが読み込まれたとき
startWatching();
