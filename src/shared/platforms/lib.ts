// 対象サービスのFQDNの一覧
const SUPPORTED_HOSTNAMES = ["tv.dmm.com"];

// URLが対象サービスのものか判定する
// FQDNの完全一致で判定する
export function isSupportedUrl(url: URL): boolean {
  return SUPPORTED_HOSTNAMES.includes(url.hostname);
}
