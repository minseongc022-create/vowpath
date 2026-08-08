"use client";

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";

type Status = {
  connections?: Record<string, unknown>;
  inbox?: {
    body?: string;
    results?: Array<{ title: string; chars: number; platform: string; markdown?: string }>;
  };
  job?: { status?: string; error?: string; results?: unknown[] };
  env?: { hasLlmKey?: boolean; llmKeyMask?: string; llmModel?: string; ntfyTopic?: string };
  tests?: Record<string, { ok?: boolean; detail?: string }>;
};

export default function AutopilotPage() {
  const [tab, setTab] = useState<"home" | "connect" | "settings">("home");
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [articleOpen, setArticleOpen] = useState<number | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2800);
  };

  const refresh = useCallback(async () => {
    const r = await fetch("/api/autopilot/status");
    if (r.status === 401) {
      setAuthed(false);
      return;
    }
    setAuthed(true);
    setStatus(await r.json());
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 4000);
    return () => clearInterval(t);
  }, [refresh]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setLoginErr("");
    const r = await fetch("/api/autopilot/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const j = await r.json();
    if (!j.ok) {
      setLoginErr(j.error || "로그인 실패");
      return;
    }
    setAuthed(true);
    await refresh();
  }

  async function generate() {
    setBusy(true);
    showToast("생성 시작…");
    try {
      const r = await fetch("/api/autopilot/generate", { method: "POST" });
      const j = await r.json();
      if (j.status === "error") showToast(j.error || "오류");
      else showToast("완료! 알림도 확인하세요");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!authed) {
    return (
      <main style={styles.wrap}>
        <form onSubmit={login} style={styles.card}>
          <h1 style={{ margin: "0 0 8px", fontSize: "1.25rem" }}>Content Autopilot</h1>
          <p style={styles.muted}>컴퓨터 없이 폰에서 — PIN 입력</p>
          <input
            style={styles.input}
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••••"
            autoFocus
          />
          <button style={styles.bigBtn} type="submit">
            들어가기
          </button>
          {loginErr ? <p style={{ color: "#f4212e" }}>{loginErr}</p> : null}
          <p style={styles.muted}>
            PIN은 Vercel 환경변수 <code>AUTOPILOT_PIN</code> 또는 첫 배포 시 자동 생성됩니다.
          </p>
        </form>
      </main>
    );
  }

  const chips = [
    ["LLM", status?.env?.hasLlmKey],
    ["WordPress", status?.tests?.wordpress?.ok],
    ["Blogger", status?.tests?.blogger?.ok],
    ["Naver", status?.tests?.naver?.ok],
  ] as const;

  return (
    <main style={styles.wrap}>
      <header style={styles.top}>
        <h1 style={{ margin: 0, fontSize: "1.15rem" }}>Content Autopilot</h1>
        <p style={{ ...styles.muted, margin: "4px 0 0" }}>PC 없이 · 데이터 OK · 24시간</p>
      </header>

      {tab === "home" && (
        <section>
          <div style={{ ...styles.card, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {chips.map(([n, ok]) => (
              <div
                key={n}
                style={{
                  ...styles.chip,
                  borderColor: ok ? "#005c4b" : "#38444d",
                  color: ok ? "#00ba7c" : "#71767b",
                }}
              >
                {n}
                {ok ? " ✓" : ""}
              </div>
            ))}
          </div>
          <button style={styles.bigBtn} disabled={busy} onClick={() => void generate()}>
            {busy ? "생성 중…" : "✨ 3개 플랫폼 전부 생성"}
          </button>
          <button
            style={{ ...styles.bigBtn, background: "#38444d" }}
            type="button"
            onClick={() => {
              const topic = status?.env?.ntfyTopic;
              if (!topic) {
                showToast("설정에서 ntfy 토픽 저장");
                setTab("settings");
                return;
              }
              window.location.href = `ntfy://subscribe/${topic}`;
              setTimeout(() => {
                window.location.href = `https://ntfy.sh/${topic}`;
              }, 800);
            }}
          >
            🔔 폰 알림 켜기
          </button>
          <div style={styles.card}>
            <strong>진행</strong>
            <p style={styles.muted}>
              {status?.job?.status === "running"
                ? "생성 중…"
                : status?.job?.status === "done"
                  ? `완료 ${status.job.results?.length || 0}편`
                  : status?.job?.status === "error"
                    ? `오류: ${status.job.error}`
                    : "버튼 한 번 → 3플랫폼 + 알림"}
            </p>
          </div>
          <div style={styles.card}>
            <strong>최근 생성</strong>
            {status?.inbox?.results?.length ? (
              status.inbox.results.map((r, i) => (
                <div key={i} style={{ borderBottom: "1px solid #38444d", padding: "12px 0" }}>
                  <strong style={{ display: "block" }}>{r.title}</strong>
                  <span style={styles.muted}>
                    {r.chars}자 · {r.platform}
                  </span>
                  {r.markdown ? (
                    <button
                      type="button"
                      style={{ ...styles.linkBtn }}
                      onClick={() => setArticleOpen(articleOpen === i ? null : i)}
                    >
                      {articleOpen === i ? "닫기" : "내용 보기 / 복사"}
                    </button>
                  ) : null}
                  {articleOpen === i && r.markdown ? (
                    <textarea readOnly value={r.markdown} style={{ ...styles.input, minHeight: 160, marginTop: 8 }} />
                  ) : null}
                </div>
              ))
            ) : (
              <p style={styles.muted}>{status?.inbox?.body || "아직 없음"}</p>
            )}
          </div>
        </section>
      )}

      {tab === "connect" && (
        <section>
          <ConnectForms onSaved={() => { showToast("저장됨 ✓"); void refresh(); }} />
        </section>
      )}

      {tab === "settings" && (
        <section>
          <SettingsForms
            initial={status}
            onSaved={() => {
              showToast("저장됨 ✓");
              void refresh();
            }}
          />
          <div style={styles.card}>
            <strong>이 주소 (북마크하세요)</strong>
            <p style={styles.muted}>
              지금 페이지 URL이 영구 주소입니다. 홈 화면에 추가하면 앱처럼 씁니다.
            </p>
            <p style={{ wordBreak: "break-all", color: "#1d9bf0" }}>
              {typeof window !== "undefined" ? window.location.href : "/autopilot"}
            </p>
          </div>
        </section>
      )}

      <nav style={styles.nav}>
        {(
          [
            ["home", "🏠", "홈"],
            ["connect", "🔗", "연결"],
            ["settings", "⚙️", "설정"],
          ] as const
        ).map(([id, icon, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              ...styles.navBtn,
              color: tab === id ? "#1d9bf0" : "#71767b",
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>{icon}</span>
            {label}
          </button>
        ))}
      </nav>
      {toast ? <div style={styles.toast}>{toast}</div> : null}
    </main>
  );
}

function ConnectForms({ onSaved }: { onSaved: () => void }) {
  return (
    <>
      <form
        style={styles.card}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void fetch("/api/autopilot/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platform: "naver", naverId: fd.get("naverId") }),
          }).then(onSaved);
        }}
      >
        <label style={styles.label}>네이버 블로그 ID</label>
        <input name="naverId" style={styles.input} placeholder="myblogid" autoCapitalize="none" />
        <button style={{ ...styles.bigBtn, background: "#38444d" }} type="submit">
          네이버 저장
        </button>
      </form>
      <form
        style={styles.card}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void fetch("/api/autopilot/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              platform: "wordpress",
              siteUrl: fd.get("siteUrl"),
              username: fd.get("username"),
              appPassword: fd.get("appPassword"),
            }),
          }).then(onSaved);
        }}
      >
        <strong>WordPress</strong>
        <label style={styles.label}>사이트 URL</label>
        <input name="siteUrl" style={styles.input} placeholder="https://..." />
        <label style={styles.label}>사용자명</label>
        <input name="username" style={styles.input} />
        <label style={styles.label}>앱 비밀번호</label>
        <input name="appPassword" type="password" style={styles.input} />
        <button style={{ ...styles.bigBtn, background: "#38444d" }} type="submit">
          WordPress 저장
        </button>
      </form>
      <form
        style={styles.card}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void fetch("/api/autopilot/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              platform: "blogger",
              blogId: fd.get("blogId"),
              accessToken: fd.get("accessToken"),
            }),
          }).then(onSaved);
        }}
      >
        <strong>Blogger</strong>
        <label style={styles.label}>Blog ID</label>
        <input name="blogId" style={styles.input} />
        <label style={styles.label}>Access Token</label>
        <input name="accessToken" type="password" style={styles.input} />
        <button style={{ ...styles.bigBtn, background: "#38444d" }} type="submit">
          Blogger 저장
        </button>
      </form>
    </>
  );
}

function SettingsForms({
  initial,
  onSaved,
}: {
  initial: Status | null;
  onSaved: () => void;
}) {
  return (
    <>
      <form
        style={styles.card}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void fetch("/api/autopilot/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              llmApiKey: fd.get("llmApiKey"),
              llmModel: fd.get("llmModel"),
            }),
          }).then(onSaved);
        }}
      >
        <label style={styles.label}>LLM API 키</label>
        <input name="llmApiKey" type="password" style={styles.input} placeholder="sk-..." />
        <label style={styles.label}>모델</label>
        <input
          name="llmModel"
          style={styles.input}
          defaultValue={initial?.env?.llmModel || "gpt-4.1-mini"}
        />
        <p style={styles.muted}>
          {initial?.env?.hasLlmKey ? `키: ${initial.env.llmKeyMask}` : "미설정 (mock/서버 OPENAI 키)"}
        </p>
        <button style={{ ...styles.bigBtn, background: "#38444d" }} type="submit">
          API 키 저장
        </button>
      </form>
      <form
        style={styles.card}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void fetch("/api/autopilot/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ntfyTopic: fd.get("ntfyTopic") }),
          }).then(onSaved);
        }}
      >
        <label style={styles.label}>ntfy 토픽 (폰 푸시)</label>
        <input
          name="ntfyTopic"
          style={styles.input}
          defaultValue={initial?.env?.ntfyTopic || ""}
          autoCapitalize="none"
        />
        <button style={{ ...styles.bigBtn, background: "#38444d" }} type="submit">
          알림 저장
        </button>
      </form>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    minHeight: "100dvh",
    background: "#0f1419",
    color: "#e7e9ea",
    fontFamily: "-apple-system,BlinkMacSystemFont,system-ui,sans-serif",
    padding: "12px 16px calc(80px + env(safe-area-inset-bottom))",
    maxWidth: 560,
    margin: "0 auto",
  },
  top: {
    position: "sticky",
    top: 0,
    background: "rgba(15,20,25,.92)",
    padding: "14px 0 10px",
    zIndex: 5,
  },
  card: {
    background: "#15202b",
    border: "1px solid #38444d",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  chip: {
    padding: 12,
    borderRadius: 12,
    background: "#0f1419",
    border: "1px solid #38444d",
    fontSize: 13,
    textAlign: "center",
  },
  bigBtn: {
    display: "block",
    width: "100%",
    border: "none",
    borderRadius: 16,
    padding: "18px 16px",
    fontSize: 17,
    fontWeight: 700,
    color: "#fff",
    background: "linear-gradient(135deg,#1d9bf0,#1781c9)",
    margin: "8px 0",
  },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "1px solid #38444d",
    background: "#0f1419",
    color: "#e7e9ea",
    fontSize: 16,
    boxSizing: "border-box",
  },
  label: { display: "block", margin: "12px 0 6px", fontSize: 13, color: "#71767b" },
  muted: { color: "#71767b", fontSize: 13 },
  nav: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    background: "rgba(21,32,43,.96)",
    borderTop: "1px solid #38444d",
    paddingBottom: "env(safe-area-inset-bottom)",
    height: "calc(64px + env(safe-area-inset-bottom))",
  },
  navBtn: {
    flex: 1,
    border: "none",
    background: "none",
    fontSize: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    paddingTop: 8,
  },
  toast: {
    position: "fixed",
    left: 16,
    right: 16,
    bottom: 80,
    background: "#15202b",
    border: "1px solid #38444d",
    padding: "12px 14px",
    borderRadius: 12,
    zIndex: 20,
  },
  linkBtn: {
    marginTop: 6,
    border: "none",
    background: "none",
    color: "#1d9bf0",
    padding: 0,
    fontSize: 13,
  },
};
