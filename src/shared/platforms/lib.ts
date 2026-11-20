// 対象サービスのFQDNの一覧
const SUPPORTED_HOSTNAMES = ["tv.dmm.com"];

// URLが対象サービスのものか判定する
// FQDNの完全一致で判定する
// manifestのmatchesとhost_permissionsがhttpsのみなのでhttpsに限定する
// httpのページではcontent scriptが実行されないため
// ポートが指定されたURLは対象外とする
// 同じDOMで表示されるか未確認なので安全のためサポートしない
// httpsの標準ポートの443を明示した場合はURLの正規化でportが空文字になるので対象になる
export function isSupportedUrl(url: URL): boolean {
  return (
    url.protocol === "https:" &&
    url.port === "" &&
    SUPPORTED_HOSTNAMES.includes(url.hostname)
  );
}
