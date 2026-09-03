"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { resolveIdentity } from "../lib/identity";
import { disablePush, enablePush, notificationPermission, pushSupported } from "../lib/push-client";
import type { NotificationPreferences } from "../lib/types";
import { ArrowIcon, ShieldIcon, SparkleIcon } from "./DajeongIcons";

const CATEGORY_LABEL: Record<keyof NotificationPreferences["categories"], string> = {
  departure: "출발·이동 알림",
  prep: "준비물(꽃·케이크·선물) 알림",
  execution: "예약·체크인 알림",
  weather: "날씨 변화 알림",
  sharedPlanChanges: "공유방 변경 알림",
  proactiveSuggestions: "하루온의 먼저 말 걸기",
};

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
        setStatus("알림을 껐어요.");
      } else {
        const granted = await enablePush(personId);
        setStatus(granted ? "알림을 켰어요." : "알림 권한을 받지 못했어요. 브라우저 설정에서 다시 허용할 수 있어요.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!prefs) return <div className="dj-loading-page"><span className="dj-spinner dj-spinner-coral" /></div>;
  const permission = notificationPermission();

  return (
    <div className="dj-plans-page dj-narrow">
      <div className="dj-plans-heading">
        <div><span className="dj-kicker"><SparkleIcon size={15} /> 알림 설정</span><h1>하루온 알림</h1><p>필요한 순간에만, 부담스럽지 않게 보내도록 조절할 수 있어요.</p></div>
        <Link href="/dajeong" className="dj-btn dj-btn-primary">계획으로 <ArrowIcon size={16} /></Link>
      </div>

      <section className="dj-card" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>이 기기에서 푸시 알림</strong>
          <button type="button" className="dj-btn dj-btn-secondary" onClick={togglePush} disabled={busy || !pushSupported()}>
            {!pushSupported() ? "이 브라우저는 지원 안 함" : permission === "granted" ? "끄기" : "켜기"}
          </button>
        </div>
        {status ? <p className="dj-companion-empty">{status}</p> : null}
      </section>

      <section className="dj-card" style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>전체 알림</strong>
          <button type="button" className={`dj-visibility-toggle ${prefs.masterEnabled ? "dj-visibility-toggle-active" : ""}`} onClick={() => save({ masterEnabled: !prefs.masterEnabled })}>
            {prefs.masterEnabled ? "켜짐" : "꺼짐"}
          </button>
        </div>
        {(Object.keys(CATEGORY_LABEL) as Array<keyof NotificationPreferences["categories"]>).map((key) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{CATEGORY_LABEL[key]}</span>
            <button
              type="button"
              className={`dj-visibility-toggle ${prefs.categories[key] ? "dj-visibility-toggle-active" : ""}`}
              onClick={() => save({ categories: { [key]: !prefs.categories[key] } })}
              disabled={!prefs.masterEnabled}
            >
              {prefs.categories[key] ? "켜짐" : "꺼짐"}
            </button>
          </div>
        ))}
      </section>

      <section className="dj-card" style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <strong><ShieldIcon size={14} /> 비공개(시크릿) 일정 알림</strong>
        <span className="dj-notify-group" role="group" aria-label="비공개 일정 알림 수준">
          {(["normal", "content_hidden", "off"] as const).map((level) => (
            <button
              key={level}
              type="button"
              className={`dj-visibility-toggle ${prefs.secretPrivacyLevel === level ? "dj-visibility-toggle-active" : ""}`}
              onClick={() => save({ secretPrivacyLevel: level })}
            >
              {level === "normal" ? "일반 알림" : level === "content_hidden" ? "내용 숨긴 알림" : "알림 끄기"}
            </button>
          ))}
        </span>
        <p className="dj-companion-empty">잠금화면을 다른 사람이 볼 수도 있으니, 기본값은 내용을 숨긴 알림이에요.</p>
      </section>

      <section className="dj-card" style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <strong>방해 금지 시간</strong>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="time"
            value={prefs.quietHours?.startTime ?? ""}
            onChange={(event) => save({ quietHours: { startTime: event.target.value, endTime: prefs.quietHours?.endTime ?? "08:00" } })}
          />
          <span>~</span>
          <input
            type="time"
            value={prefs.quietHours?.endTime ?? ""}
            onChange={(event) => save({ quietHours: { startTime: prefs.quietHours?.startTime ?? "23:00", endTime: event.target.value } })}
          />
          {prefs.quietHours ? <button type="button" className="dj-visibility-toggle" onClick={() => save({ quietHours: null })}>해제</button> : null}
        </div>
        <p className="dj-companion-empty">이 시간에는 급하지 않은 알림을 미뤄서 보내요. 예약을 놓칠 것 같은 긴급 알림은 예외예요.</p>
      </section>
    </div>
  );
}
