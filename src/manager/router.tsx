import {
  Link,
  Outlet,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

// 管理ページの画面構成
// 拡張機能のページにはサーバーがなくパスを変更すると再読み込み時に表示できないので
// ハッシュでルートを指定する
// 例：#/works/dmm/7ah1ifmv7tfqin5tryqyqgsh0

// 全画面に共通のタブ
const rootRoute = createRootRoute({
  component: () => (
    <main className="flex flex-col gap-4 p-4">
      <h1 className="font-semibold">NowOnAir</h1>
      <nav className="flex gap-4">
        <Link to="/">ダッシュボード</Link>
        <Link to="/works">作品一覧</Link>
      </nav>
      <Outlet />
    </main>
  ),
});

// 今見られる未視聴の話の一覧
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <p>ダッシュボード：未実装</p>,
});

// 登録済みの作品の一覧
const worksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/works",
  component: () => <p>作品一覧：未実装</p>,
});

// 作品の詳細
const workRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/works/$platform/$workId",
  component: function WorkDetail() {
    const { platform, workId } = workRoute.useParams();
    return <p>作品の詳細：{platform} {workId}</p>;
  },
});

const routeTree = rootRoute.addChildren([dashboardRoute, worksRoute, workRoute]);

export const router = createRouter({ routeTree, history: createHashHistory() });

// Linkのtoやparamsを型で検査するためにルーターの型を登録する
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
