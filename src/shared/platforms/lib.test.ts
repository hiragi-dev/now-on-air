import { describe, expect, it } from "vitest";
import { isSupportedUrl } from "./lib";

describe("isSupportedUrl", () => {
  // パスとクエリが異なっても対象とする
  it.each([
    { url: "https://tv.dmm.com/" },
    // パスとクエリ
    { url: "https://tv.dmm.com/vod/detail/?season=abc" },
    // httpsの標準ポートを明示
    // URLの正規化でポートの指定なしと同じになる
    { url: "https://tv.dmm.com:443/" },
  ])("$url は対象", ({ url }) => {
    expect(isSupportedUrl(new URL(url))).toBe(true);
  });

  it.each([
    // サブドメインが異なる
    { url: "https://www.dmm.com/" },
    { url: "https://a.tv.dmm.com/" },
    // ドメインが異なる
    { url: "https://tv.dmm.jp/" },
    // tv.dmm.comを文字列として含む
    // 文字列の部分一致で判定する実装に変更された場合に検出するため
    { url: "https://tv.dmm.com.example.com/" },
    { url: "https://example.com/tv.dmm.com" },
    { url: "https://example.com/?url=tv.dmm.com" },
    // スキームが異なる
    // manifestのmatchesがhttpsのみでcontent scriptが実行されないため
    { url: "http://tv.dmm.com/" },
    // ポートが指定されている
    // 同じDOMで表示されるか未確認なので安全のためサポートしない
    { url: "https://tv.dmm.com:8443/" },
  ])("$url は対象外", ({ url }) => {
    expect(isSupportedUrl(new URL(url))).toBe(false);
  });
});
