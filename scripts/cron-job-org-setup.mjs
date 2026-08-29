/**
 * Idempotent cron-job.org setup from config/cron.schedule.json externalCrons.
 *
 *   export CRONJOB_ORG_API_KEY=...   # cron-job.org → Settings → API
 *   export CRON_SECRET=...           # same as Vercel /api/cron/*
 *   export NEXT_PUBLIC_APP_URL=https://effiroad.com
 *   node scripts/cron-job-org-setup.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveInfraEnv, vercelToken } from "./lib/vercel-infra.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.cron-job.org";
const apiKey = process.env.CRONJOB_ORG_API_KEY?.trim();
let cronSecret = process.env.CRON_SECRET?.trim();
const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://effiroad.com").replace(/\/$/, "");

function loadCronConfig() {
  return JSON.parse(readFileSync(join(root, "config/cron.schedule.json"), "utf8"));
}

async function cronApi(path, method, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`cron-job.org ${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

/**
 * cron-job.org는 분 단위 스케줄만 지원한다(초 단위 실행 시각을 못 정한다).
 * `-1`은 "그 자리는 매번"이라는 뜻이라 `minutes: [-1]`은 **매분** 실행이다.
 *
 * ⚠️ intervalSeconds를 무시하고 항상 [-1]을 쓰면, config에 600초(10분)라고
 * 적어도 실제로는 60초마다 도는 job이 등록된다. 표기와 실제 동작이 어긋나는
 * 건 이 세션에서 반복해서 사고를 냈던 바로 그 패턴이다 — 여기서도 반복하지 않는다.
 */
function minuteMarks(intervalSeconds) {
  const minutes = Math.round(intervalSeconds / 60);
  if (minutes <= 1) return [-1]; // 매분
  if (60 % minutes !== 0) {
    throw new Error(
      `intervalSeconds=${intervalSeconds} (${minutes}분)는 60을 나누어떨어뜨리지 않아 분 단위 스케줄로 못 옮긴다`,
    );
  }
  const marks = [];
  for (let m = 0; m < 60; m += minutes) marks.push(m);
  return marks;
}

/**
 * 이 크론이 부를 주소.
 *
 * ★ 항목마다 baseUrl이 다를 수 있다
 *
 * 자비스는 www.giucuu.com에 있고, effiroad.com은 텅 비어(모든 경로 404)
 * 있다. 예전엔 baseUrl이 하나뿐이라 전부 effiroad.com을 불렀고, 자비스를
 * 옮긴 뒤 크론이 조용히 404를 두드리며 죽었다 — 실제로 난 사고다.
 * 그래서 항목이 baseUrl을 직접 지정할 수 있게 한다.
 */
function urlFor(entry) {
  const base = (entry.baseUrl ?? baseUrl).replace(/\/$/, "");
  return `${base}${entry.path}`;
}

function jobPayload(entry) {
  const url = urlFor(entry);
  const title = `Effiroad ${entry.path.replace(/^\/api\/(cron|jarvis)\//, "")} (${entry.intervalSeconds}s)`;
  return {
    job: {
      url,
      title,
      enabled: true,
      saveResponses: false,
      requestMethod: 0,
      requestTimeout: 120,
      schedule: {
        timezone: "UTC",
        expiresAt: 0,
        hours: [-1],
        mdays: [-1],
        minutes: minuteMarks(entry.intervalSeconds),
        months: [-1],
        wdays: [-1],
      },
      extendedData: {
        headers: {
          Authorization: `Bearer ${cronSecret}`,
        },
      },
    },
  };
}

async function main() {
  if (!apiKey) {
    console.log("Skip cron-job.org — set CRONJOB_ORG_API_KEY (Console → Settings → API key)");
    process.exit(0);
  }
  if (!cronSecret && vercelToken()) {
    await resolveInfraEnv();
    cronSecret = process.env.CRON_SECRET?.trim();
  }
  if (!cronSecret) {
    console.log("Skip cron-job.org — set VERCEL_TOKEN (auto-reads CRON_SECRET) or CRON_SECRET in GitHub secrets");
    process.exit(0);
  }

  const config = loadCronConfig();
  const entries = config.externalCrons ?? [];
  const retired = config.retiredCrons ?? [];
  const { jobs = [] } = await cronApi("/jobs", "GET");
  let created = 0;
  let updated = 0;

  for (const entry of entries) {
    const url = urlFor(entry);
    const existing = jobs.find((j) => j.url === url);
    const payload = jobPayload(entry);

    if (existing) {
      await cronApi(`/jobs/${existing.jobId}`, "PATCH", payload);
      console.log(`↻ updated job ${existing.jobId} → ${url}`);
      updated++;
    } else {
      const { jobId } = await cronApi("/jobs", "PUT", payload);
      console.log(`✓ created job ${jobId} → ${url}`);
      created++;
    }
  }

  // ★ 은퇴한 크론은 config에서 지우는 것만으로는 안 멈춘다 — cron-job.org에
  // 이미 만들어진 job은 이 스크립트가 그 URL을 다시 안 건드리면 계속 돈다.
  // 실제로 이게 사고였다: 옛 toss-shop 엔진을 자비스로 완전히 갈아탔는데
  // cron-job.org의 옛 60초짜리 job은 그대로 남아 옛 저장소 기준으로 계속
  // 초안을 만들고, 새 파이프라인과 앞뒤가 안 맞는 문자를 사장님께 보냈다
  // ("승인 대기 2건" 다음에 바로 "15건"). retiredCrons에 적힌 경로는
  // 여기서 명시적으로 끈다 — config에 없다고 조용히 지나가지 않는다.
  let disabled = 0;
  for (const entry of retired) {
    const url = urlFor(entry);
    const existing = jobs.find((j) => j.url === url);
    if (!existing) continue;
    await cronApi(`/jobs/${existing.jobId}`, "DELETE");
    console.log(`✕ retired job ${existing.jobId} → ${url} (${entry.reason ?? "no reason given"})`);
    disabled++;
  }

  console.log(
    `\nDone: ${created} created, ${updated} updated, ${disabled} retired (${entries.length} active external crons, ${retired.length} tracked retirements)\n`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
