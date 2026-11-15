// content scriptの入り口
// 機能ごとのファイルを読み込む
import "./block";
import "./collector";
import "./title";

console.log("[NowOnAir] content script loaded:", location.href);
