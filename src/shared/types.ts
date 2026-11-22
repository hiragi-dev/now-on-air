import { z } from "zod";

// サイドパネルとcontent scriptの両方で使用する型

// 保存する各話
// 収集時の型もこのスキーマから生成し形の定義を1か所に限定する
export const SavedEpisode = z.object({
  // 各話のリンクのcontentパラメータ
  id: z.string(),
  // 各話のリンク内の文字列
  label: z.string(),
  // 話数
  number: z.number().int().positive(),
  // 視聴した日時
  // ISO 8601形式で未視聴ならnull
  // 管理パネルで視聴のリンクを押した時点を視聴とする
  watchedAt: z.iso.datetime().nullable(),
});

// リアタイ化している作品のバージョン1
// 開始日時と間隔から解禁された話数を都度計算する
// ストレージから読み込んだ値をこのスキーマで実行時に検証する
export const WatchingAnimeV1 = z.object({
  v: z.literal(1),
  platform: z.literal("dmm"),
  workId: z.string(),
  title: z.string(),
  // 話数の昇順で保持する
  // 一部のタブだけ登録すると話数が連続しないので話数も保存する
  // 解禁は話数ではなく配列の並び順で計算する
  episodes: z.array(SavedEpisode),
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
// 保存する各話から視聴の記録を除外した形
// 収集の処理が保存のスキーマの項目を知らずに済むように型で除外する
export type CapturedEpisode = Omit<z.infer<typeof SavedEpisode>, "watchedAt">;

// 録画用のPortを識別する名前
// collector.tsをサイドパネルから読み込むとリスナーが登録されるのでsharedに配置する
export const CAPTURE_PORT_NAME = "capture";

// Portでサイドパネルからcontent scriptに送信するメッセージ
// workIdは収集したリンクが対象作品のものか判定するために使用する
export type SidePanelToContentMessage =
  | { type: "captureStart"; workId: string }
  | { type: "captureEnd" };

// 作品名の問い合わせ
// 返事を待つためPortではなくsendMessageで送信する
export type GetTitleRequest = { type: "getTitle" };
// 取得できなければnull
export type GetTitleResponse = { title: string | null };

// Portでcontent scriptからサイドパネルに送信するメッセージ
// 新しく収集した各話だけを送信する
export type ContentToSidePanelMessage = {
  type: "diff";
  episodes: CapturedEpisode[];
};

