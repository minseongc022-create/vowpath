import type { Brand } from "./produce.ts";
import type { CloudConnections } from "./store.ts";
import { saveArticle, type CloudArticle } from "./store.ts";

export async function publishCloud(args: {
  brand: Brand;
  title: string;
  markdown: string;
  chars: number;
  connections: CloudConnections;
}): Promise<CloudArticle> {
  const createdAt = new Date().toISOString();
  const base: CloudArticle = {
    brandId: args.brand.id,
    title: args.title,
    markdown: args.markdown,
    chars: args.chars,
    platform: args.brand.platform,
    createdAt,
  };

  if (args.brand.platform === "wordpress") {
    const wp = args.connections.wordpress;
    if (wp?.baseUrl && wp.username && wp.appPassword) {
      const auth = Buffer.from(`${wp.username}:${wp.appPassword}`).toString("base64");
      const res = await fetch(`${wp.baseUrl.replace(/\/$/, "")}/wp-json/wp/v2/posts`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: args.title,
          content: markdownToHtml(args.markdown),
          status: "draft",
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { link?: string };
        base.url = data.link;
        base.platform = "wordpress";
      } else {
        base.platform = "wordpress-draft-local";
        base.url = `kv://${args.brand.id}`;
      }
    } else {
      base.platform = "storage";
      base.url = `kv://${args.brand.id}`;
    }
  } else if (args.brand.platform === "blogger") {
    const bg = args.connections.blogger;
    if (bg?.blogId && bg.accessToken) {
      const res = await fetch(
        `https://www.googleapis.com/blogger/v3/blogs/${bg.blogId}/posts?isDraft=true`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bg.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            kind: "blogger#post",
            title: args.title,
            content: markdownToHtml(args.markdown),
          }),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as { url?: string };
        base.url = data.url;
      } else {
        base.platform = "blogger-draft-local";
        base.url = `kv://${args.brand.id}`;
      }
    } else {
      base.platform = "storage";
      base.url = `kv://${args.brand.id}`;
    }
  } else {
    // Naver: store for copy-paste
    base.platform = "naver-export";
    base.url = `kv://naver/${args.brand.id}`;
  }

  await saveArticle(base);
  return base;
}

function markdownToHtml(md: string): string {
  return md
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${esc(line.slice(2))}</h1>`;
      if (line.startsWith("## ")) return `<h2>${esc(line.slice(3))}</h2>`;
      if (line.startsWith("- ")) return `<li>${esc(line.slice(2))}</li>`;
      if (/^\d+\.\s+/.test(line)) return `<li>${esc(line.replace(/^\d+\.\s+/, ""))}</li>`;
      if (!line.trim()) return "";
      return `<p>${esc(line)}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
