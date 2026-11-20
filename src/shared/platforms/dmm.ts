import { isSupportedUrl } from "./lib";

// DMM TVのURLに関する判定

// 再生ページのURLならtrueを返す
// TODO: 仮の条件
// 実際の再生ページのURLを確認して修正する
export function isPlaybackUrl(url: string): boolean {
  return url.includes("playback");
}

// DMM TVのdetailのページは作品の詳細ではなく各話の一覧ページ
export function isDetailUrl(url: URL): boolean {
  if (!isSupportedUrl(url)) return false;
  const { hostname, pathname } = url;
  if (hostname !== "tv.dmm.com") return false;
  return (
    pathname.startsWith("/vod/detail/") ||
    pathname.startsWith("/vod/rated/detail/")
  );
}

// seasonパラメータを作品IDとして扱う
export function getWorkId(url: URL): string | null {
  if (!isDetailUrl(url)) return null;
  return url.searchParams.get("season");
}

// 各話のIDと表示用の文字列
export type EpisodeLink = { id: string; label: string };

// 要素とその子孫から各話のリンクを検索する
// 録画中に追加された要素だけを調べるために使用する
// 他の作品のリンクを除外するためseasonがworkIdと一致するリンクのみを対象にする
export function findEpisodeLinks(root: Element, workId: string): EpisodeLink[] {
  const selector = 'a[href*="content="]';
  const links = [...root.querySelectorAll<HTMLAnchorElement>(selector)];
  // querySelectorAllはroot自身を検索対象に含めない
  if (root.matches(selector)) links.unshift(root as HTMLAnchorElement);

  const episodes: EpisodeLink[] = [];
  for (const link of links) {
    const params = new URL(link.href).searchParams;
    if (params.get("season") !== workId) continue;
    const id = params.get("content");
    if (!id) continue;
    // リンク内の文字列を表示用に使用する
    // 例：第23話 横浜騒乱編Ｖ
    const label = link.textContent?.trim() ?? "";
    episodes.push({ id, label });
  }
  return episodes;
}

// 一覧のダイアログから作品名を取得する
// 作品画像のaltが作品名だけを持つ
// 各話のサムネイルはpictureで囲まれていないので対象外になる
export function getTitle(): string | null {
  const alt = document
    .querySelector<HTMLImageElement>('[role="dialog"] picture img')
    ?.alt.trim();
  return alt ? alt : null;
}

// 選択中のタブから話数の起点を取得する
// タブのボタンの文字列を話数の起点として扱う
// タブがない作品や数値に変換できない場合は1
export function getTabStartNumber(): number {
  const tabs = document.querySelector(
    'div[aria-label="vod-list-episode-tab"]',
  );
  if (!tabs) return 1;
  const text = tabs
    .querySelector('button[aria-selected="true"] span')
    ?.textContent?.trim();
  const number = Number(text);
  return Number.isInteger(number) && number > 0 ? number : 1;
}
