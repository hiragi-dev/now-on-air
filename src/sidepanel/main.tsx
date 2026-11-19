import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// TailwindのCSSはサイドパネルの入り口でだけ読み込む
// content scriptで読み込むとDMMのページに注入され干渉するため
import "../shared/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
