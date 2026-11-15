import { z } from "zod";

// サイドパネルとcontent scriptの両方で使用する型

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

// 録画中に収集した各話の情報
export type CapturedEpisode = {
  // 各話のリンクのcontentパラメータ
  id: string;
  // 各話のリンク内の文字列
  label: string;
  // 話数
  number: number;
};

// 録画用のPortを識別する名前
// collector.tsをサイドパネルから読み込むとリスナーが登録されるのでsharedに配置する
export const CAPTURE_PORT_NAME = "capture";

// Portでサイドパネルからcontent scriptに送信するメッセージ
// workIdは収集したリンクが対象作品のものか判定するために使用する
export type SidePanelToContentMessage =
  | { type: "captureStart"; workId: string }
  | { type: "captureEnd" };

// Portでcontent scriptからサイドパネルに送信するメッセージ
// 新しく収集した各話だけを送信する
export type ContentToSidePanelMessage = {
  type: "diff";
  episodes: CapturedEpisode[];
};

