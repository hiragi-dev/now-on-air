import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
// TailwindのCSSは管理ページの入り口でだけ読み込む
// content scriptで読み込むとDMMのページに注入され干渉するため
import "../shared/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
