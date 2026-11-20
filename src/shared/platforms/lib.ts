// 対象サービスのFQDNの一覧
const SUPPORTED_HOSTNAMES = ["tv.dmm.com"];

// URLが対象サービスのものか判定する
// FQDNの完全一致で判定する
// manifestのmatchesとhost_permissionsがhttpsのみなのでhttpsに限定する
// httpのページではcontent scriptが実行されないため
export function isSupportedUrl(url: URL): boolean {
  return (
    url.protocol === "https:" && SUPPORTED_HOSTNAMES.includes(url.hostname)
  );
}
