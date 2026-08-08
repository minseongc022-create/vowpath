import { CLOUD_BRANDS, pickTitle, qualityOk, writeArticle } from "./produce.ts";
import { publishCloud } from "./publish.ts";
import {
  getConnections,
  getSettings,
  setInbox,
  setJob,
  type CloudArticle,
  type CloudJob,
} from "./store.ts";

async function notify(body: string, topic?: string, webhook?: string) {
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body }),
      });
    } catch {
      /* ignore */
    }
  }
  if (topic) {
    try {
      await fetch(`https://ntfy.sh/${topic}`, {
        method: "POST",
        headers: {
          Title: "Content Autopilot done",
          Tags: "white_check_mark",
          "Content-Type": "text/plain; charset=utf-8",
        },
        body,
      });
    } catch {
      /* ignore */
    }
  }
}

export async function runCloudGenerateAll(): Promise<CloudJob> {
  const id = String(Date.now());
  const job: CloudJob = { id, status: "running", startedAt: new Date().toISOString() };
  await setJob(job);

  try {
    const settings = await getSettings();
    const connections = await getConnections();
    const results: CloudArticle[] = [];

    for (const brand of CLOUD_BRANDS) {
      const titleAngle = pickTitle(brand.id);
      let written = await writeArticle({
        brand,
        title: titleAngle,
        apiKey: settings.llmApiKey,
        model: settings.llmModel,
      });

      let gate = qualityOk(written.title, written.markdown, brand.minChars);
      if (!gate.ok) {
        written = await writeArticle({
          brand,
          title: titleAngle,
          apiKey: settings.llmApiKey,
          model: settings.llmModel,
        });
        gate = qualityOk(written.title, written.markdown, brand.minChars);
      }
      if (!gate.ok) {
        throw new Error(`Quality gate failed for ${brand.id}: ${gate.detail}`);
      }

      const published = await publishCloud({
        brand,
        title: written.title,
        markdown: written.markdown,
        chars: written.chars,
        connections,
      });
      results.push(published);
    }

    const body = results
      .map((r) => `• [${r.brandId}] ${r.title} (${r.chars}자) → ${r.platform}`)
      .join("\n");

    await setInbox({
      title: "블로그 초안 생성 완료",
      body: `${results.length}편 생성됨\n\n${body}`,
      results, // includes markdown for phone copy-paste
      at: new Date().toISOString(),
    });

    await notify(
      `${results.length}편 생성됨\n\n${body}`,
      settings.ntfyTopic || process.env.NTFY_TOPIC,
      settings.webhookUrl || process.env.NOTIFY_WEBHOOK_URL,
    );

    const done: CloudJob = {
      ...job,
      status: "done",
      finishedAt: new Date().toISOString(),
      results,
    };
    await setJob(done);
    return done;
  } catch (e) {
    const err: CloudJob = {
      ...job,
      status: "error",
      finishedAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : String(e),
    };
    await setJob(err);
    return err;
  }
}
