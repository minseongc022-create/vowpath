import { test } from "node:test";
import assert from "node:assert/strict";
import { extractRoutes } from "@/vibesafe/lib/analysis/collect";

/**
 * 라우트 목록은 AI에게 주는 입력 중 가장 값싸고 밀도 높은 정보다.
 * 여기가 틀리면 AI가 없는 주소로 흐름을 만들고, 검사는 전부 404로 실패한다.
 */
const blobs = (...paths) => paths.map((path) => ({ path, type: "blob", size: 100, sha: "x" }));

test("App Router의 page/route를 URL로 바꾼다", () => {
  const routes = extractRoutes(
    blobs("app/page.tsx", "app/login/page.tsx", "app/api/posts/route.ts"),
  );
  assert.deepEqual(routes, [
    { path: "/", kind: "page" },
    { path: "/api/posts", kind: "api" },
    { path: "/login", kind: "page" },
  ]);
});

test("라우트 그룹 (marketing) 은 URL에 나타나지 않는다", () => {
  const routes = extractRoutes(blobs("app/(marketing)/about/page.tsx"));
  assert.deepEqual(routes, [{ path: "/about", kind: "page" }]);
});

test("동적 구간은 :param 으로 표시한다", () => {
  const routes = extractRoutes(blobs("app/posts/[id]/page.tsx", "app/shop/[...slug]/page.tsx"));
  assert.deepEqual(routes.map((r) => r.path), ["/posts/:id", "/shop/:slug"]);
});

test("src/ 접두사가 있어도 같게 다룬다", () => {
  const routes = extractRoutes(blobs("src/app/login/page.tsx"));
  assert.deepEqual(routes, [{ path: "/login", kind: "page" }]);
});

test("Pages Router도 인식한다", () => {
  const routes = extractRoutes(
    blobs("pages/index.tsx", "pages/about.tsx", "pages/api/hello.ts", "pages/blog/[slug].tsx"),
  );
  assert.deepEqual(routes, [
    { path: "/", kind: "page" },
    { path: "/about", kind: "page" },
    { path: "/api/hello", kind: "api" },
    { path: "/blog/:slug", kind: "page" },
  ]);
});

test("_app·_document는 화면이 아니다", () => {
  const routes = extractRoutes(blobs("pages/_app.tsx", "pages/_document.tsx"));
  assert.deepEqual(routes, []);
});

test("라우트가 아닌 파일은 무시한다", () => {
  const routes = extractRoutes(
    blobs("app/components/Button.tsx", "lib/utils.ts", "README.md", "app/globals.css"),
  );
  assert.deepEqual(routes, []);
});

test("Next.js 프로젝트가 아니면 빈 목록을 준다", () => {
  assert.deepEqual(extractRoutes(blobs("index.html", "main.py")), []);
});
