import { describe, expect, it } from "vitest";
import { isDetailUrl } from "./dmm";

describe("isDetailUrl", () => {
  it.each([
    { url: "https://tv.dmm.com/vod/detail/?season=7ah1ifmv7tfqin5tryqyqgsh0" },
    // ratedが付与される一覧ページ
    {
      url: "https://tv.dmm.com/vod/rated/detail/?season=g6zxmqikbcu6q4fnhyvfjdch3&content=67aseragtmf5mkn08c1o78pq9",
    },
  ])("$url は一覧ページ", ({ url }) => {
    expect(isDetailUrl(new URL(url))).toBe(true);
  });

  it.each([
    // ホスト名がa.dmm.comやa.tv.dmm.comで異なる
    { url: "https://a.dmm.com/vod/detail/?season=7ah1ifmv7tfqin5tryqyqgsh0" },
    { url: "https://a.tv.dmm.com/vod/detail/?season=7ah1ifmv7tfqin5tryqyqgsh0" },
    // ホスト名は正しいが一覧ページのパスではない
    { url: "https://tv.dmm.com/" },
    // 一覧ページのパスを途中に含む
    // パスの部分一致で判定する実装に変更された場合に検出するため
    {
      url: "https://tv.dmm.com/example/vod/detail/?season=7ah1ifmv7tfqin5tryqyqgsh0",
    },
    {
      url: "https://tv.dmm.com/example/vod/rated/detail/?season=g6zxmqikbcu6q4fnhyvfjdch3&content=67aseragtmf5mkn08c1o78pq9",
    },
    // 以下の2件はisSupportedUrlで判定しているが実装に依存せず仕様として確認する
    // スキームがhttpで異なる
    // manifestのmatchesがhttpsのみでcontent scriptが実行されないため
    { url: "http://tv.dmm.com/vod/detail/?season=7ah1ifmv7tfqin5tryqyqgsh0" },
    // ポートが8443で指定されている
    // 同じDOMで表示されるか未確認なので安全のためサポートしない
    {
      url: "https://tv.dmm.com:8443/vod/detail/?season=7ah1ifmv7tfqin5tryqyqgsh0",
    },
  ])("$url は一覧ページではない", ({ url }) => {
    expect(isDetailUrl(new URL(url))).toBe(false);
  });
});
