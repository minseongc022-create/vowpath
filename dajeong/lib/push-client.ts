"use client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/dajeong-sw.js", { scope: "/dajeong/" });
  } catch {
    return null;
  }
}

/**
 * Requests notification permission (must be called from a user gesture, and only after the app
 * has shown the user why — see NotificationPermissionPrompt) and, if granted, creates a real
 * PushManager subscription and registers it with the server. Returns false on any failure
 * without throwing, so callers can show a plain "지금은 안 될 것 같아" instead of crashing.
 */
export async function enablePush(personId: string): Promise<boolean> {
  if (!pushSupported()) return false;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;
  const registration = await registerServiceWorker();
  if (!registration) return false;
  try {
    const keyResponse = await fetch("/api/dajeong/notifications/vapid-key");
    const keyData = await keyResponse.json().catch(() => ({})) as { configured?: boolean; publicKey?: string };
    if (!keyData.configured || !keyData.publicKey) return false;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey) as BufferSource,
    });
    const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
    const response = await fetch("/api/dajeong/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, endpoint: json.endpoint, keys: json.keys, userAgent: navigator.userAgent.slice(0, 300) }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function disablePush(personId: string): Promise<void> {
  if (!pushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/dajeong/");
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await fetch("/api/dajeong/notifications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }
  } catch {
    // Best-effort — a stale local subscription with no server counterpart is harmless.
  }
}

/** Uploads the current plan to the server so the cron sweep can schedule notifications for it
 * even when solo (never otherwise leaves the browser). No-op-safe to call repeatedly. */
export async function registerPlanForNotifications(personId: string, plan: unknown): Promise<void> {
  try {
    await fetch("/api/dajeong/notifications/register-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, plan }),
    });
  } catch {
    // Best-effort — the in-app experience still works without server-side scheduling.
  }
}
