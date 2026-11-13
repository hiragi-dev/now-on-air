import { z } from "zod";

// ポップアップとcontent scriptの両方で使用する型

// リアタイ化している作品のバージョン1
// 開始日時と間隔から解禁された話数を都度計算する
// ストレージから読み込んだ値をこのスキーマで実行時に検証する
export const WatchingAnimeV1 = z.object({
  v: z.literal(1),
  platform: z.literal("dmm"),
  workId: z.string(),
  title: z.string(),
  // 配列の順序がそのまま話数に対応する
  episodeIds: z.array(z.string()),
  // ISO 8601形式の日時
  startedAt: z.iso.datetime(),
  // 1話ずつ解禁する間隔
  // ユーザーが分単位で指定できるようにする
  intervalMinutes: z.number().int().positive(),
});

// 最新のバージョンの型
// バージョンを更新したらここを置換する
export type WatchingAnime = z.infer<typeof WatchingAnimeV1>;

// ポップアップからcontent scriptに送信するメッセージ
// 操作が増えたらここに追加する
export type PopupMessage = { type: "registerWork" };

// registerWorkでcontent script側の処理が失敗したときのエラー
// 種類ごとにポップアップの表示を変更する
// 種類は登録処理を実装するときに追加する
export type RegisterWorkError = { type: "unknown"; message: string };

// registerWorkの応答
export type RegisterWorkResponse =
  | { ok: true; title: string; episodeCount: number }
  | { ok: false; error: RegisterWorkError };
