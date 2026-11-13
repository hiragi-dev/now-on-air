import type { WatchingAnime } from "./types";

// 作品を1件読み込んだ結果
// 起こりうる結果をそのまま列挙する
export type ReadWorkResult =
  | { kind: "found"; work: WatchingAnime }
  | { kind: "notRegistered" }
  // このコードが対応していない新しいバージョンのデータ
  // 拡張機能を更新すれば読み込める
  | { kind: "unknownVersion"; version: unknown }
  // スキーマに一致しない破損したデータ
  // 再登録が必要
  | { kind: "invalid" };

// chrome.storage.localには名前空間がないので
// キーにwork:の接頭辞を付与して作品の格納領域として扱う
// 例：work:dmm:7ah1ifmv7tfqin5tryqyqgsh0
export function workKey(
  platform: WatchingAnime["platform"],
  workId: string,
): string {
  return `work:${platform}:${workId}`;
}
