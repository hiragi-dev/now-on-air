import type { CSSProperties } from "react";

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483647,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "16px",
  background: "rgba(0, 0, 0, 0.85)",
  color: "#fff",
  fontSize: "20px",
};

const buttonStyle: CSSProperties = {
  padding: "8px 24px",
  fontSize: "16px",
  cursor: "pointer",
};

// コンテンツをブロックしたことを知らせる画面
export function BlockedOverlay() {
  // 直接アクセスした場合は戻る先がないのでボタンを出さない
  const canGoBack = window.navigation.canGoBack;

  return (
    <div style={overlayStyle}>
      <div style={{ fontSize: "64px" }}>🚫</div>
      <p>このコンテンツはブロックされました</p>
      {canGoBack && (
        <button style={buttonStyle} onClick={() => history.back()}>
          前のページに戻る
        </button>
      )}
    </div>
  );
}
