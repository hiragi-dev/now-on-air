import { z } from "zod";

// ポップアップとcontent scriptの両方で使う型

// リアタイ化している作品のバージョン1
// 始めた日と間隔から解禁された話数を都度計算する
// ストレージから読んだ値をこのスキーマで実行時にチェックする
export const WatchingAnimeV1 = z.object({
  v: z.literal(1),
  platform: z.literal("dmm"),
  workId: z.string(),
  title: z.string(),
  // 並び順がそのまま話数になる
  episodeIds: z.array(z.string()),
  // ISO 8601形式の日時
  startedAt: z.iso.datetime(),
  // 1話ずつ解禁する間隔
  // ユーザーが分単位まで選べるようにする
  intervalMinutes: z.number().int().positive(),
});

// 最新のバージョンの型
// バージョンを上げたらここを差し替える
export type WatchingAnime = z.infer<typeof WatchingAnimeV1>;

// ポップアップからcontent scriptに送るメッセージ
// 操作が増えたらここに足す
export type PopupMessage = { type: "registerWork" };

// registerWorkへの返事
export type RegisterWorkResponse =
  | { ok: true; title: string; episodeCount: number }
  | { ok: false; message: string };
