import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Brand } from "../config/types.ts";
import { ROOT } from "../config/load.ts";

export type NaverPublishResult = {
  platform: "naver";
  status: "draft";
  url: string;
  externalId: string;
};

/** Naver Blog has no stable public posting API — export paste-ready HTML + metadata. */
export async function publishNaverExport(
  brand: Brand,
  title: string,
  markdown: string,
  slug: string,
): Promise<NaverPublishResult> {
  const dir = path.join(ROOT, "data", "naver-export", brand.id);
  await mkdir(dir, { recursive: true });

  const html = markdownToSimpleHtml(markdown);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `${stamp}-${slug}`;

  await writeFile(path.join(dir, `${base}.html`), html, "utf8");
  await writeFile(path.join(dir, `${base}.md`), markdown, "utf8");
  await writeFile(
    path.join(dir, `${base}-meta.json`),
    JSON.stringify(
      {
        title,
        slug,
        brandId: brand.id,
        exportedAt: new Date().toISOString(),
        instructions:
          "네이버 블로그 글쓰기 → HTML 붙여넣기 또는 마크다운 참고. 자동 발행 API는 공식 미제공.",
      },
      null,
      2,
    ),
    "utf8",
  );

  return {
    platform: "naver",
    status: "draft",
    url: path.join(dir, `${base}.html`),
    externalId: base,
  };
}

function markdownToSimpleHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${escapeHtml(line.slice(2))}</li>`);
      continue;
    }
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
    if (line.trim() === "") continue;
    out.push(`<p>${escapeHtml(line)}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
