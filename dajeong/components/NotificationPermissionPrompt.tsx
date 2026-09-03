"use client";

import { useEffect, useState } from "react";
import { enablePush, notificationPermission, pushSupported, registerPlanForNotifications } from "../lib/push-client";
import type { DajeongPlan } from "../lib/types";
import { SparkleIcon } from "./DajeongIcons";

const DISMISS_KEY = "dajeong:push-prompt-dismissed:v1";

/**
 * Shown once, after there's an actual plan to be proactive about — never on first load before
 * the user has seen any value. Declining keeps the app fully usable; nothing is gated on this.
 */
export function NotificationPermissionPrompt({ plan, personId }: { plan: DajeongPlan; personId: string }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"granted" | "denied" | null>(null);

  useEffect(() => {
    if (!pushSupported()) return;
    if (window.localStorage.getItem(DISMISS_KEY)) return;
    if (notificationPermission() !== "default") return;
    if (!plan.items.length) return;
    setVisible(true);
  }, [plan.items.length]);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  async function accept() {
    setBusy(true);
    const granted = await enablePush(personId);
    if (granted) await registerPlanForNotifications(personId, plan);
    setResult(granted ? "granted" : "denied");
    window.localStorage.setItem(DISMISS_KEY, "1");
    setBusy(false);
    window.setTimeout(() => setVisible(false), granted ? 2200 : 1400);
  }

  if (!visible) return null;
  return (
    <div className="dj-push-prompt dj-card">
      <span className="dj-proactive-mark"><SparkleIcon size={16} /></span>
      {result === "granted" ? (
        <p><strong>좋아, 이제 필요한 순간에 먼저 알려줄게.</strong></p>
      ) : result === "denied" ? (
        <p>알겠어, 알림 없이도 계획은 그대로 볼 수 있어. 나중에 설정에서 다시 켤 수 있어.</p>
      ) : (
        <>
          <p><strong>출발할 시간이나 예약 놓칠 것 같을 때 내가 먼저 알려줄까?</strong> 알림이 너무 많이 오지 않도록 조절해서 보낼게.</p>
          <div className="dj-push-prompt-actions">
            <button type="button" className="dj-btn dj-btn-primary" onClick={accept} disabled={busy}>알려줘</button>
            <button type="button" className="dj-btn dj-btn-secondary" onClick={dismiss} disabled={busy}>괜찮아</button>
          </div>
        </>
      )}
    </div>
  );
}
