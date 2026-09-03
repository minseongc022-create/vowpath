/**
 * Service worker for 하루위드(dajeong) proactive push notifications only. Registered with
 * scope "/dajeong/" (see dajeong/lib/push-client.ts) so it never intercepts requests for any
 * other product in this monorepo.
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "하루위드", body: "", deepLink: "/dajeong" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Non-JSON payload — fall back to the default copy above rather than throwing.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.notificationId || undefined,
      data: { deepLink: payload.deepLink || "/dajeong" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const deepLink = event.notification.data?.deepLink || "/dajeong";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(deepLink) && "focus" in client) return client.focus();
      }
      for (const client of clientList) {
        if ("focus" in client && "navigate" in client) {
          return client.focus().then(() => client.navigate(deepLink));
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(deepLink);
    }),
  );
});
