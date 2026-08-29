"use client";

/**
 * 연동 설정 — 자비스가 일하려면 필요한 것들
 *
 * ★ 무엇이 없으면 무엇이 안 되는지 분명히 말한다
 *
 * 옛 화면은 "연동됨/미연동"만 보여줬다. 그러면 사장님은 **뭐가 안 되는지**
 * 모른 채 자비스가 일을 안 한다고 느낀다. 여기서는 각 연동이 빠지면
 * 정확히 무엇이 멈추는지 함께 쓴다.
 */

import { useCallback, useEffect, useState } from "react";
import { JV_API } from "../routes";

type Conn = { connected: boolean; fromEnv?: boolean; accessKeyMasked?: string | null };

type Payload = {
  settings: {
    monthlyGoalKrw: number;
    autopilotEnabled: boolean;
    autoPublish: boolean;
    alertPhone: string | null;
    tossSandbox: boolean;
  };
  connections: { toss: Conn; domeggook: Conn; openai: Conn };
};

export function SettingsView() {
  const [data, setData] = useState<Payload | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [goalManwon, setGoalManwon] = useState("500");
  const [phone, setPhone] = useState("");
  const [tossAccessKey, setTossAccessKey] = useState("");
  const [tossSecretKey, setTossSecretKey] = useState("");
  const [domeggookApiKey, setDomeggookApiKey] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(JV_API.settings);
      if (!res.ok) throw new Error(String(res.status));
      const d = (await res.json()) as Payload;
      setData(d);
      setGoalManwon(String(Math.round(d.settings.monthlyGoalKrw / 10_000)));
      setPhone(d.settings.alertPhone ?? "");
    } catch {
      setMsg({ kind: "err", text: "설정을 불러오지 못했습니다." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (patch: Record<string, unknown>) => {
      setSaving(true);
      setMsg(null);
      try {
        const res = await fetch(JV_API.settings, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const body = (await res.json()) as { reason?: string };
        if (!res.ok) {
          setMsg({ kind: "err", text: body.reason ?? "저장하지 못했습니다." });
          return;
        }
        setMsg({ kind: "ok", text: "저장했습니다." });
        // 비밀키는 저장 후 화면에서 지운다 — 남겨두면 실수로 다시 저장된다
        setTossAccessKey("");
        setTossSecretKey("");
        setDomeggookApiKey("");
        await load();
      } catch {
        setMsg({ kind: "err", text: "저장하지 못했습니다." });
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  if (!data) return <div className="jv-empty">불러오는 중…</div>;

  const c = data.connections;

  return (
    <div className="jv-settings">
      {msg && <div className={msg.kind === "ok" ? "jv-msg jv-msg-ok" : "jv-msg jv-msg-err"}>{msg.text}</div>}

      {/* ── 연동 상태 ── */}
      <section>
        <h2>연동</h2>
        <ConnRow
          label="도매꾹 · 도매매"
          connected={c.domeggook.connected}
          need="이게 없으면 상품을 아예 못 찾습니다"
          note={c.domeggook.fromEnv ? "서버 환경변수로 연결됨" : undefined}
        />
        <ConnRow
          label="토스쇼핑"
          connected={c.toss.connected}
          need="이게 없으면 찾고 만들 수는 있지만 실제 등록이 안 됩니다"
        />
        <ConnRow
          label="대화 AI"
          connected={c.openai.connected}
          need="없어도 기본 명령은 동작합니다. 있으면 아무 말이나 알아듣습니다"
        />
      </section>

      {/* ── 자동 운전 ── */}
      <section>
        <h2>자동 운전</h2>
        <Toggle
          label="10분마다 자동으로 상품 찾기"
          desc="기준을 넘는 상품만 검수 대기로 올립니다"
          on={data.settings.autopilotEnabled}
          disabled={saving}
          onChange={(v) => void save({ autopilotEnabled: v })}
        />
        <Toggle
          label="확인 없이 바로 등록"
          desc="꺼두면 항상 사장님이 승인한 뒤에만 올라갑니다"
          on={data.settings.autoPublish}
          disabled={saving}
          onChange={(v) => void save({ autoPublish: v })}
        />
      </section>

      {/* ── 목표 ── */}
      <section>
        <h2>월 목표</h2>
        <p className="jv-help">목표를 바꾸면 하루에 몇 개를 올릴지 자비스가 다시 계산합니다.</p>
        <div className="jv-inline">
          <input
            type="number"
            inputMode="numeric"
            value={goalManwon}
            onChange={(e) => setGoalManwon(e.target.value)}
            min={100}
            max={5000}
          />
          <span className="jv-unit">만원</span>
          <button
            type="button"
            className="jv-btn jv-btn-ghost"
            disabled={saving}
            onClick={() => void save({ monthlyGoalKrw: Number(goalManwon) * 10_000 })}
          >
            저장
          </button>
        </div>
      </section>

      {/* ── 알림 ── */}
      <section>
        <h2>알림 받을 번호</h2>
        <p className="jv-help">검수할 상품이 생기면 문자로 알려드립니다.</p>
        <div className="jv-inline">
          <input
            type="tel"
            inputMode="numeric"
            placeholder="01012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            type="button"
            className="jv-btn jv-btn-ghost"
            disabled={saving}
            onClick={() => void save({ alertPhone: phone })}
          >
            저장
          </button>
        </div>
      </section>

      {/* ── 키 입력 ── */}
      <section>
        <h2>API 키</h2>
        <p className="jv-help">
          한 번 저장하면 다시 보이지 않습니다. 바꾸려면 새로 넣어 저장하세요.
        </p>
        {!c.toss.connected && (
          <p className="jv-help" style={{ marginTop: -6 }}>
            토스 키는{" "}
            <a
              href="https://shopping-seller.toss.im"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--jv-blue)", fontWeight: 700 }}
            >
              토스쇼핑 셀러센터
            </a>
            {" "}→ 쇼핑 → 연동 관리에서 발급받아 아래에 넣어주세요. 이게 없으면 상품을 찾고
            만들 수는 있지만 실제 등록은 안 됩니다.
          </p>
        )}
        <KeyField label="도매꾹 API 키" value={domeggookApiKey} onChange={setDomeggookApiKey} />
        <KeyField label="토스 Access Key" value={tossAccessKey} onChange={setTossAccessKey} />
        <KeyField label="토스 Secret Key" value={tossSecretKey} onChange={setTossSecretKey} />
        <button
          type="button"
          className="jv-btn jv-btn-primary"
          style={{ width: "100%", marginTop: 4 }}
          disabled={saving || (!domeggookApiKey && !tossAccessKey && !tossSecretKey)}
          onClick={() =>
            void save({
              ...(domeggookApiKey ? { domeggookApiKey } : {}),
              ...(tossAccessKey ? { tossAccessKey } : {}),
              ...(tossSecretKey ? { tossSecretKey } : {}),
            })
          }
        >
          키 저장
        </button>
      </section>

      <style jsx>{`
        .jv-settings { padding: 18px 18px 40px; }
        section { margin-bottom: 30px; }
        h2 { font-size: 16px; font-weight: 800; margin: 0 0 10px; letter-spacing: -0.2px; }
        .jv-help { font-size: 13px; color: var(--jv-muted); margin: 0 0 12px; line-height: 1.6; }
        .jv-inline { display: flex; gap: 8px; align-items: center; }
        .jv-inline input {
          flex: 1; border: 1px solid var(--jv-line); border-radius: 12px;
          padding: 12px 14px; font-size: 16px; font-family: inherit; outline: none; min-width: 0;
        }
        .jv-inline input:focus { border-color: var(--jv-blue); }
        .jv-unit { font-size: 14px; color: var(--jv-muted); font-weight: 600; }
        .jv-msg { border-radius: 12px; padding: 12px 14px; font-size: 14px; margin-bottom: 16px; }
        .jv-msg-ok { background: #e9f9f3; color: #0b8f6a; }
        .jv-msg-err { background: #fff0f0; color: var(--jv-red); }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function ConnRow({
  label,
  connected,
  need,
  note,
}: {
  label: string;
  connected: boolean;
  need: string;
  note?: string;
}) {
  return (
    <div className="row">
      <div className="left">
        <div className="label">{label}</div>
        <div className="need">{note ?? need}</div>
      </div>
      <span className={connected ? "pill on" : "pill off"}>{connected ? "연결됨" : "미연결"}</span>
      <style jsx>{`
        .row {
          display: flex; align-items: center; gap: 12px; padding: 13px 0;
          border-bottom: 1px solid var(--jv-line);
        }
        .left { flex: 1; min-width: 0; }
        .label { font-size: 15px; font-weight: 600; margin-bottom: 3px; }
        .need { font-size: 12px; color: var(--jv-muted); line-height: 1.5; }
        .pill {
          flex: 0 0 auto; font-size: 12px; font-weight: 700;
          padding: 5px 11px; border-radius: 999px;
        }
        .on { background: #e9f9f3; color: #0b8f6a; }
        .off { background: #fff0f0; color: var(--jv-red); }
      `}</style>
    </div>
  );
}

function Toggle({
  label,
  desc,
  on,
  disabled,
  onChange,
}: {
  label: string;
  desc: string;
  on: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="row">
      <div className="left">
        <div className="label">{label}</div>
        <div className="desc">{desc}</div>
      </div>
      <input
        type="checkbox"
        checked={on}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={on ? "sw on" : "sw"} aria-hidden />
      <style jsx>{`
        .row {
          display: flex; align-items: center; gap: 12px; padding: 13px 0;
          border-bottom: 1px solid var(--jv-line); cursor: pointer;
        }
        .left { flex: 1; min-width: 0; }
        .label { font-size: 15px; font-weight: 600; margin-bottom: 3px; }
        .desc { font-size: 12px; color: var(--jv-muted); line-height: 1.5; }
        input { position: absolute; opacity: 0; pointer-events: none; }
        .sw {
          flex: 0 0 auto; width: 46px; height: 27px; border-radius: 999px;
          background: #d3d8e0; position: relative; transition: background 0.15s;
        }
        .sw::after {
          content: ""; position: absolute; top: 3px; left: 3px;
          width: 21px; height: 21px; border-radius: 50%; background: #fff;
          transition: transform 0.15s; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        .sw.on { background: var(--jv-green); }
        .sw.on::after { transform: translateX(19px); }
      `}</style>
    </label>
  );
}

function KeyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="f">
      <label>{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="변경할 때만 입력"
        autoComplete="off"
      />
      <style jsx>{`
        .f { margin-bottom: 12px; }
        label { display: block; font-size: 13px; font-weight: 600; color: var(--jv-muted); margin-bottom: 6px; }
        input {
          width: 100%; border: 1px solid var(--jv-line); border-radius: 12px;
          padding: 12px 14px; font-size: 15px; font-family: inherit; outline: none;
        }
        input:focus { border-color: var(--jv-blue); }
      `}</style>
    </div>
  );
}
