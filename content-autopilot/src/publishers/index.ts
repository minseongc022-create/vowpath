import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArticleDraft, Brand } from "../config/types.ts";
import { ROOT } from "../config/load.ts";

export type PublishResult = { platform: string; id?: string; url?: string; mode: string };

export async function publishArticle(brand: Brand, article: ArticleDraft): Promise<PublishResult> {
  const mode = process.env.PUBLISH_MODE || "filesystem";
  const platform = mode === "filesystem" ? "filesystem" : brand.publishing.platform;

  if (platform === "wordpress") return publishWordpress(article, mode);
  if (platform === "blogger") return publishBlogger(article, mode);
  return publishFilesystem(brand, article);
}

async function publishFilesystem(brand: Brand, article: ArticleDraft): Promise<PublishResult> {
  const outDir = join(ROOT, process.env.OUTPUT_DIR || "./data/output", brand.id);
  mkdirSync(outDir, { recursive: true });
  const base = `${article.slug}-${Date.now()}`;
  const jsonPath = join(outDir, `${base}.json`);
  const mdPath = join(outDir, `${base}.md`);
  writeFileSync(
    jsonPath,
    JSON.stringify({ brandId: brand.id, ...article, savedAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
  writeFileSync(mdPath, article.markdown, "utf8");
  return { platform: "filesystem", url: mdPath, mode: "filesystem" };
}

async function publishWordpress(article: ArticleDraft, mode: string): Promise<PublishResult> {
  const base = process.env.WP_BASE_URL?.replace(/\/$/, "");
  const user = process.env.WP_USERNAME;
  const pass = process.env.WP_APP_PASSWORD;
  if (!base || !user || !pass) {
    throw new Error("WordPress credentials missing (WP_BASE_URL, WP_USERNAME, WP_APP_PASSWORD)");
  }

  const status = mode === "publish" ? "publish" : "draft";
  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  const res = await fetch(`${base}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: article.title,
      content: article.html,
      status,
      excerpt: article.excerpt,
      slug: article.slug,
    }),
  });
  if (!res.ok) {
    throw new Error(`WordPress publish failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { id?: number; link?: string };
  return { platform: "wordpress", id: String(data.id ?? ""), url: data.link, mode: status };
}

async function publishBlogger(article: ArticleDraft, mode: string): Promise<PublishResult> {
  const blogId = process.env.BLOGGER_BLOG_ID;
  const token = process.env.BLOGGER_ACCESS_TOKEN;
  if (!blogId || !token) {
    throw new Error("Blogger credentials missing (BLOGGER_BLOG_ID, BLOGGER_ACCESS_TOKEN)");
  }

  const isDraft = mode !== "publish";
  const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${isDraft ? "draft" : ""}`.replace(
    /\/$/,
    ""
  );
  // Blogger draft endpoint differs; use posts with isDraft flag via insert
  const endpoint = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts${isDraft ? "?isDraft=true" : ""}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind: "blogger#post",
      title: article.title,
      content: article.html,
      labels: article.tags,
    }),
  });
  if (!res.ok) {
    throw new Error(`Blogger publish failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { id?: string; url?: string };
  return { platform: "blogger", id: data.id, url: data.url, mode: isDraft ? "draft" : "publish" };
}
