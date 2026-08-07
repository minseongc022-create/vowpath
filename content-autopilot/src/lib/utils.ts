export function log(level: "info" | "warn" | "error", msg: string, extra?: unknown) {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${msg}`;
  if (extra !== undefined) {
    console[level === "info" ? "log" : level](line, extra);
  } else {
    console[level === "info" ? "log" : level](line);
  }
}

export function slugify(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^\w\s-가-힣]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return cleaned || `post-${Date.now()}`;
}

export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inList = false;
  let inOl = false;

  const flushList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }
    if (/^###\s+/.test(line)) {
      flushList();
      out.push(`<h3>${escapeHtml(line.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushList();
      out.push(`<h2>${escapeHtml(line.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushList();
      out.push(`<h1>${escapeHtml(line.replace(/^#\s+/, ""))}</h1>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        flushList();
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inlineFormat(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (!inOl) {
        flushList();
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${inlineFormat(line.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }
    flushList();
    out.push(`<p>${inlineFormat(line)}</p>`);
  }
  flushList();
  return out.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineFormat(s: string): string {
  const escaped = escapeHtml(s);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

export function countKoreanishChars(text: string): number {
  return text.replace(/\s+/g, "").length;
}
