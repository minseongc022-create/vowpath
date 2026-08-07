export const MANIFEST = {
  name: "Content Autopilot",
  short_name: "Autopilot",
  description: "3개 플랫폼 블로그 자동 생성",
  start_url: "/",
  display: "standalone",
  background_color: "#0f1419",
  theme_color: "#1d9bf0",
  orientation: "portrait-primary",
  lang: "ko",
  icons: [
    {
      src: "/icon-192.svg",
      sizes: "192x192",
      type: "image/svg+xml",
      purpose: "any maskable",
    },
    {
      src: "/icon-512.svg",
      sizes: "512x512",
      type: "image/svg+xml",
      purpose: "any maskable",
    },
  ],
};

export const ICON_192 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="#1d9bf0"/><path d="M48 128V64h24l24 40 24-40h24v64h-28V92l-22 36h-16l-22-36v36z" fill="#fff"/></svg>`;

export const ICON_512 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#1d9bf0"/><path d="M128 352V160h64l64 104 64-104h64v192h-72V240l-60 96h-40l-60-96v112z" fill="#fff"/></svg>`;

export const SERVICE_WORKER = `
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('autopilot-v1').then(c => c.addAll(['/'])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then(r => r || caches.match('/')))
  );
});
`.trim();

export function ntfySubscribeUrl(topic: string): string {
  return `https://ntfy.sh/${topic}`;
}

export function ntfyAppUrl(topic: string): string {
  return `ntfy://subscribe/${topic}`;
}
