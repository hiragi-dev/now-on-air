// DMM TVのURLに関する判定

// 再生ページのURLならtrueを返す
// TODO: 仮の条件
// 実際の再生ページのURLを確認して修正する
export function isPlaybackUrl(url: string): boolean {
  return url.includes("playback");
}

// 作品の一覧ページのURLならtrueを返す
// 例：https://tv.dmm.com/vod/detail/?season=7ah1ifmv7tfqin5tryqyqgsh0
// ratedが付与される一覧ページも存在する
// 例：https://tv.dmm.com/vod/rated/detail/?season=g6zxmqikbcu6q4fnhyvfjdch3&content=67aseragtmf5mkn08c1o78pq9
export function isDetailUrl(url: string): boolean {
  const { hostname, pathname } = new URL(url);
  if (hostname !== "tv.dmm.com") return false;
  return (
    pathname.startsWith("/vod/detail/") ||
    pathname.startsWith("/vod/rated/detail/")
  );
}

// 一覧ページのURLから作品IDを抽出する
// 抽出できなければnull
export function getWorkId(url: string): string | null {
  if (!isDetailUrl(url)) return null;
  return new URL(url).searchParams.get("season");
}

// collectEpisodeIdsの結果
export type CollectEpisodeIdsResult =
  | { kind: "found"; ids: string[] }
  // 1件も収集できなかった
  // ページ側の仕様変更や収集するタイミングの考慮漏れで発生する
  | { kind: "notFound" };

// 一覧ページから各話のIDを収集する
// 各話のリンクのhrefに含まれるcontentパラメータを各話のIDとして扱う
// 他の作品のリンクを除外するためseasonがworkIdと一致するリンクのみを対象にする
// IDはページ内の出現順に返す
export function collectEpisodeIds(workId: string): CollectEpisodeIdsResult {
  const links = document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="content="]',
  );
  const ids: string[] = [];
  for (const link of links) {
    const params = new URL(link.href).searchParams;
    if (params.get("season") !== workId) continue;
    const id = params.get("content");
    if (id) ids.push(id);
  }
  if (ids.length === 0) return { kind: "notFound" };
  return { kind: "found", ids };
}
