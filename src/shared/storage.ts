import type { WatchingAnime } from "./types";

// 作品を1つ読んだ結果
// 起こりうる結果をそのまま並べる
export type ReadWorkResult =
  | { kind: "found"; work: WatchingAnime }
  | { kind: "notRegistered" }
  // このコードが知らない新しいバージョンのデータ
  // 拡張機能を更新すれば読める
  | { kind: "unknownVersion"; version: unknown }
  // スキーマに合わない壊れたデータ
  // 登録し直すしかない
  | { kind: "invalid" };

// chrome.storage.localには区切りがないので
// キーの先頭にwork:をつけて作品を入れる場所として扱う
// 例：work:dmm:7ah1ifmv7tfqin5tryqyqgsh0
export function workKey(
  platform: WatchingAnime["platform"],
  workId: string,
): string {
  return `work:${platform}:${workId}`;
}
