/**
 * 일회성 진단 — cron-job.org에서 /api/jarvis/cron job이 실제로 최근에
 * 몇 시에 돌았는지(과거 실행 이력) 확인한다. GitHub Actions 스케줄
 * (jarvis-pulse.yml)이 몇 시간 비는 구간을 cron-job.org가 실제로
 * 메꿔줬는지 확인하기 위해 만들었다 — 확인 후 지운다.
 *
 *   export CRONJOB_ORG_API_KEY=...
 *   export NEXT_PUBLIC_APP_URL=https://effiroad.com
 *   node scripts/cron-job-org-history-check.mjs
 */
const API = "https://api.cron-job.org";
const apiKey = process.env.CRONJOB_ORG_API_KEY?.trim();
const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://effiroad.com").replace(/\/$/, "");

async function cronApi(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`cron-job.org GET ${path} → ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  if (!apiKey) {
    console.log("CRONJOB_ORG_API_KEY not set — cannot check cron-job.org");
    process.exit(1);
  }

  const { jobs = [] } = await cronApi("/jobs");
  const targetUrl = `${baseUrl}/api/jarvis/cron`;
  const job = jobs.find((j) => j.url === targetUrl);

  if (!job) {
    console.log(`✕ NO cron-job.org job registered for ${targetUrl}`);
    console.log("모든 등록된 job:");
    for (const j of jobs) console.log(`  - ${j.jobId} ${j.url} enabled=${j.enabled}`);
    process.exit(0);
  }

  console.log(`✓ job found: id=${job.jobId} enabled=${job.enabled}`);
  console.log(`  schedule: ${JSON.stringify(job.schedule)}`);
  console.log(`  lastStatus=${job.lastStatus} lastDuration=${job.lastDuration}ms`);
  console.log(`  lastExecution (unix)=${job.lastExecution}`);
  if (job.lastExecution) {
    console.log(`  lastExecution (UTC)=${new Date(job.lastExecution * 1000).toISOString()}`);
  }

  const history = await cronApi(`/jobs/${job.jobId}/history`);
  const items = history.history ?? [];
  console.log(`\n최근 실행 이력 ${items.length}건 (최신순):`);
  for (const h of items.slice(0, 20)) {
    const when = new Date(h.date * 1000).toISOString();
    console.log(`  ${when}  status=${h.status} statusText=${h.statusText ?? ""} httpStatus=${h.httpStatus ?? ""} duration=${h.duration}ms`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
