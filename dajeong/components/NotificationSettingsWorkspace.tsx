"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { resolveIdentity } from "../lib/identity";
import { disablePush, enablePush, notificationPermission, pushSupported } from "../lib/push-client";
import type { NotificationPreferences } from "../lib/types";
import { ArrowIcon, ShieldIcon, SparkleIcon } from "./DajeongIcons";

type CategoryKey = keyof NotificationPreferences["categories"];

/** 켜면 실제로 무슨 알림이 오는지까지 적는다. 이름만 보고는 켤지 말지 판단할 수 없다. */
const CATEGORIES: Array<{ key: CategoryKey; label: string; detail: string }> = [
  { key: "departure", label: "출발·이동", detail: "지금 나가야 다음 일정에 늦지 않을 때" },
  { key: "prep", label: "준비물", detail: "꽃·케이크·선물을 주문하거나 찾아와야 할 때" },
  { key: "execution", label: "예약·체크인", detail: "예약 확인이나 체크인이 필요한 순간" },
  { key: "weather", label: "날씨 변화", detail: "비·추위처럼 그날 동선을 바꿔야 할 때" },
  { key: "sharedPlanChanges", label: "공유방 변경", detail: "같이 보는 사람이 일정을 바꿨을 때" },
  { key: "proactiveSuggestions", label: "먼저 말 걸기", detail: "하루위드가 챙길 게 보이면 먼저 알려줘" },
];

function Switch(props: { on: boolean; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.on}
      aria-label={props.label}
      className="dj-switch"
      onClick={props.onClick}
      disabled={props.disabled}
    />
  );
}

export function NotificationSettingsWorkspace() {
  const [personId, setPersonId] = useState("");
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const identity = await resolveIdentity();
      setPersonId(identity.id);
      const response = await fetch(`/api/dajeong/notifications/preferences?personId=${encodeURIComponent(identity.id)}`);
      const data = await response.json().catch(() => ({})) as { preferences?: NotificationPreferences };
      if (data.preferences) setPrefs(data.preferences);
    })();
  }, []);

  async function save(update: Partial<Omit<NotificationPreferences, "categories" | "quietHours">> & { categories?: Partial<NotificationPreferences["categories"]>; quietHours?: NotificationPreferences["quietHours"] | null }) {
    if (!personId) return;
    const response = await fetch("/api/dajeong/notifications/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, ...update }),
    });
    const data = await response.json().catch(() => ({})) as { preferences?: NotificationPreferences };
    if (data.preferences) setPrefs(data.preferences);
  }

  async function togglePush() {
    setBusy(true);
    setStatus("");
    try {
      if (notificationPermission() === "granted") {
        await disablePush(personId);
        setStatus("알림 껐어.");
      } else {
        const granted = await enablePush(personId);
        setStatus(granted ? "알림 켰어." : "알림 권한을 못 받았어. 브라우저 설정에서 다시 허용할 수 있어.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!prefs) return <div className="dj-loading-page"><span className="dj-spinner dj-spinner-coral" /></div>;

  const permission = notificationPermission();
  const supported = pushSupported();
  const pushOn = permission === "granted";

  return (
    <div className="dj-plans-page dj-narrow">
      <div className="dj-plans-heading">
        <div>
          <span className="dj-kicker"><SparkleIcon size={15} /> 알림 설정</span>
          <h1>하루위드 알림</h1>
          <p>필요한 순간에만 오게 해뒀어. 여기서 하나씩 켜고 끌 수 있어.</p>
        </div>
        <Link href="/dajeong" className="dj-btn dj-btn-primary">계획으로 <ArrowIcon size={16} /></Link>
      </div>

      <section className="dj-card dj-settings-section">
        <div className="dj-settings-section-head">
          <strong>이 기기</strong>
          <p>알림은 기기마다 따로 켜야 해. 여기서 켜야 나머지 설정이 실제로 동작해.</p>
        </div>
        <div className="dj-settings-row">
          <div className="dj-settings-row-label">
            <span>푸시 알림</span>
            <em>{!supported ? "이 브라우저는 푸시를 지원하지 않아" : pushOn ? "이 기기로 알림이 와" : "아직 이 기기에서는 안 와"}</em>
          </div>
          <button type="button" className={`dj-btn ${pushOn ? "dj-btn-secondary" : "dj-btn-primary"}`} onClick={togglePush} disabled={busy || !supported}>
            {busy ? "바꾸는 중" : pushOn ? "끄기" : "켜기"}
          </button>
        </div>
        {status ? <p className="dj-settings-status" style={{ marginTop: 12 }}>{status}</p> : null}
      </section>

      <section className="dj-card dj-settings-section">
        <div className="dj-settings-section-head">
          <strong>무엇을 알릴지</strong>
          <p>전체를 끄면 아래 항목은 켜져 있어도 알림이 가지 않아.</p>
        </div>
        <div className="dj-settings-row">
          <div className="dj-settings-row-label">
            <span>전체 알림</span>
            <em>{prefs.masterEnabled ? "아래 켜둔 것만 보내" : "지금은 아무것도 안 보내"}</em>
          </div>
          <Switch on={prefs.masterEnabled} onClick={() => save({ masterEnabled: !prefs.masterEnabled })} label="전체 알림" />
        </div>
        {CATEGORIES.map((category) => (
          <div key={category.key} className="dj-settings-row" data-muted={!prefs.masterEnabled}>
            <div className="dj-settings-row-label">
              <span>{category.label}</span>
              <em>{category.detail}</em>
            </div>
            <Switch
              on={prefs.categories[category.key]}
              onClick={() => save({ categories: { [category.key]: !prefs.categories[category.key] } })}
              disabled={!prefs.masterEnabled}
              label={category.label}
            />
          </div>
        ))}
      </section>

      <section className="dj-card dj-settings-section">
        <div className="dj-settings-section-head">
          <strong><ShieldIcon size={14} /> 비공개 일정 알림</strong>
          <p>잠금화면은 옆 사람도 볼 수 있어서, 기본은 내용을 가린 알림이야.</p>
        </div>
        <div className="dj-settings-choice" role="group" aria-label="비공개 일정 알림 수준">
          {([
            { level: "normal", label: "그대로 보여주기" },
            { level: "content_hidden", label: "내용 가리기" },
            { level: "off", label: "안 보내기" },
          ] as const).map((option) => (
            <button
              key={option.level}
              type="button"
              aria-pressed={prefs.secretPrivacyLevel === option.level}
              onClick={() => save({ secretPrivacyLevel: option.level })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="dj-card dj-settings-section">
        <div className="dj-settings-section-head">
          <strong>방해 금지 시간</strong>
          <p>이 시간엔 급하지 않은 알림을 미뤄뒀다 보내. 예약을 놓칠 것 같은 건 예외야.</p>
        </div>
        <div className="dj-settings-times">
          <input
            type="time"
            aria-label="방해 금지 시작 시간"
            value={prefs.quietHours?.startTime ?? ""}
            onChange={(event) => save({ quietHours: { startTime: event.target.value, endTime: prefs.quietHours?.endTime ?? "08:00" } })}
          />
          <span>~</span>
          <input
            type="time"
            aria-label="방해 금지 종료 시간"
            value={prefs.quietHours?.endTime ?? ""}
            onChange={(event) => save({ quietHours: { startTime: prefs.quietHours?.startTime ?? "23:00", endTime: event.target.value } })}
          />
          {prefs.quietHours ? <button type="button" onClick={() => save({ quietHours: null })}>해제</button> : null}
        </div>
        {!prefs.quietHours ? <p className="dj-settings-note">아직 설정 안 했어. 시간을 넣으면 그 사이엔 조용히 있을게.</p> : null}
      </section>
    </div>
  );
}
