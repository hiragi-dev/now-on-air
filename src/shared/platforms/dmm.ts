// DMM TVのURLに関する判定

// 再生ページのURLならtrueを返す
// TODO: 仮の条件
// 実際の再生ページのURLを確認して直す
export function isPlaybackUrl(url: string): boolean {
  return url.includes("playback");
}

// 作品の一覧ページのURLならtrueを返す
// 例：https://tv.dmm.com/vod/detail/?season=7ah1ifmv7tfqin5tryqyqgsh0
// ratedがつく一覧ページもある
// 例：https://tv.dmm.com/vod/rated/detail/?season=g6zxmqikbcu6q4fnhyvfjdch3&content=67aseragtmf5mkn08c1o78pq9
export function isDetailUrl(url: string): boolean {
  const { hostname, pathname } = new URL(url);
  if (hostname !== "tv.dmm.com") return false;
  return (
    pathname.startsWith("/vod/detail/") ||
    pathname.startsWith("/vod/rated/detail/")
  );
}

// 一覧ページのURLから作品IDを取り出す
// 取り出せなければnull
export function getWorkId(url: string): string | null {
  if (!isDetailUrl(url)) return null;
  return new URL(url).searchParams.get("season");
}
