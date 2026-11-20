import { type WatchingAnime, WatchingAnimeV1 } from "./types";

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
  | { kind: "invalid" }
  // chrome.storageからの読み込みの失敗
  // 例外を投げずに結果の1種類として返す
  | { kind: "readFailed"; message: string };

// chrome.storage.localには名前空間がないので
// キーにwork:の接頭辞を付与して作品の格納領域として扱う
// 例：work:dmm:7ah1ifmv7tfqin5tryqyqgsh0
export function workKey(
  platform: WatchingAnime["platform"],
  workId: string,
): string {
  return `work:${platform}:${workId}`;
}

// 保存されている作品を1件読み込む
// 値はvで振り分けてからスキーマで検証する
export async function readWork(
  platform: WatchingAnime["platform"],
  workId: string,
): Promise<ReadWorkResult> {
  const key = workKey(platform, workId);
  // キーが存在しない場合は空のオブジェクトが返る
  let items: Record<string, unknown>;
  try {
    items = await chrome.storage.local.get(key);
  } catch (error) {
    console.error("[NowOnAir] 作品を読み込めませんでした", error);
    const message = error instanceof Error ? error.message : String(error);
    return { kind: "readFailed", message };
  }
  if (!(key in items)) return { kind: "notRegistered" };

  const value = items[key];
  const version =
    typeof value === "object" && value !== null && "v" in value
      ? value.v
      : undefined;
  // vが1以上の整数でなければ破損したデータとする
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { kind: "invalid" };
  }
  // このコードが対応している最新のバージョンより新しいデータ
  if (version > 1) return { kind: "unknownVersion", version };

  const parsed = WatchingAnimeV1.safeParse(value);
  if (!parsed.success) return { kind: "invalid" };
  return { kind: "found", work: parsed.data };
}
