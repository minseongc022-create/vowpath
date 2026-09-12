import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { runSecurityProbes } from "@/vibesafe/lib/security/probe";

/**
 * 보안 점검기는 두 방향으로 다 틀릴 수 있다.
 *  - 진짜를 놓치면 제품이 거짓말을 한 게 된다.
 *  - 멀쩡한 걸 잡으면 아무도 목록을 안 본다.
 * 그래서 취약한 사이트와 멀쩡한 사이트를 둘 다 띄워놓고 검증한다.
 */

function jwt(role) {
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const p = Buffer.from(JSON.stringify({ role, iss: "supabase" })).toString("base64url");
  return `${h}.${p}.ZmFrZXNpZ25hdHVyZWZha2VzaWduYXR1cmU`;
}

function startServer(handler) {
  return new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, url: `http://127.0.0.1:${server.address().port}` }),
    );
  });
}

test("인터넷에 열린 .env를 잡는다", async () => {
  const { server, url } = await startServer((req, res) => {
    if (req.url === "/.env") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end("DATABASE_URL=postgres://u:p@h/db\nAPI_KEY=abc\n");
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<!doctype html><html><body>ok</body></html>");
  });
  try {
    const findings = await runSecurityProbes(url);
    const hit = findings.find((f) => f.probe.includes("_.env"));
    assert.ok(hit, ".env 노출을 놓쳤다");
    assert.equal(hit.severity, "critical");
    // 증거에 실제 내용이 담기면 안 된다 — 우리 DB가 남의 키 모음집이 된다.
    assert.ok(!hit.evidence.includes("postgres://"), "증거에 실제 값이 들어갔다");
  } finally {
    server.close();
  }
});

test("SPA의 404 HTML은 .env로 오해하지 않는다", async () => {
  // 많은 앱이 없는 경로에 200 + HTML을 준다. 이걸 잡으면 전부 오탐이 된다.
  const { server, url } = await startServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<!doctype html><html><body>Not found</body></html>");
  });
  try {
    const findings = await runSecurityProbes(url);
    assert.equal(findings.filter((f) => f.probe.includes("exposed_file")).length, 0);
  } finally {
    server.close();
  }
});

test("service_role 키는 잡고 anon 키는 잡지 않는다", async () => {
  // ★ 이 구분을 못 하면 Supabase 쓰는 모든 앱에서 오탐이 난다.
  const { server, url } = await startServer((req, res) => {
    if (req.url === "/app.js") {
      res.writeHead(200, { "Content-Type": "application/javascript" });
      return res.end(`const a="${jwt("anon")}";const b="${jwt("service_role")}";`);
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<!doctype html><html><body><script src="/app.js"></script></body></html>`);
  });
  try {
    const findings = await runSecurityProbes(url);
    const secrets = findings.filter((f) => f.probe.startsWith("secret_in_bundle"));
    assert.equal(secrets.length, 1, `service_role 하나만 잡아야 하는데 ${secrets.length}건 잡았다`);
    assert.match(secrets[0].title, /service_role/);
  } finally {
    server.close();
  }
});

test("로그인 화면이 뜨는 /admin은 경고하지 않는다", async () => {
  const { server, url } = await startServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    if (req.url === "/admin") {
      return res.end(
        `<!doctype html><html><body><h1>로그인</h1><input type="password">${"<p>x</p>".repeat(100)}</body></html>`,
      );
    }
    res.end("<!doctype html><html><body>ok</body></html>");
  });
  try {
    const findings = await runSecurityProbes(url);
    assert.equal(findings.filter((f) => f.probe.startsWith("open_admin")).length, 0);
  } finally {
    server.close();
  }
});

test("로그인 없이 열리는 관리자 화면은 잡는다", async () => {
  const { server, url } = await startServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    if (req.url === "/admin") {
      return res.end(
        `<!doctype html><html><body><h1>관리자</h1>${"<p>주문 관리 사용자 관리</p>".repeat(60)}</body></html>`,
      );
    }
    res.end("<!doctype html><html><body>ok</body></html>");
  });
  try {
    const findings = await runSecurityProbes(url);
    assert.ok(findings.some((f) => f.probe.startsWith("open_admin")), "열린 관리자 화면을 놓쳤다");
  } finally {
    server.close();
  }
});

test("보안 헤더가 갖춰진 사이트는 헤더 경고를 내지 않는다", async () => {
  const { server, url } = await startServer((_req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/html",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Strict-Transport-Security": "max-age=63072000",
    });
    res.end("<!doctype html><html><body>ok</body></html>");
  });
  try {
    const findings = await runSecurityProbes(url);
    assert.equal(findings.filter((f) => f.probe.startsWith("missing_")).length, 0);
  } finally {
    server.close();
  }
});

test("점검은 GET만 쓴다 — 남의 데이터를 바꾸지 않는다", async () => {
  const methods = new Set();
  const { server, url } = await startServer((req, res) => {
    methods.add(req.method);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<!doctype html><html><body>ok</body></html>");
  });
  try {
    await runSecurityProbes(url);
    assert.deepEqual([...methods], ["GET"], `GET 외의 메서드를 썼다: ${[...methods]}`);
  } finally {
    server.close();
  }
});
