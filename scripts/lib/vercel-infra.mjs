/**
 * Resolve Vercel project id + CRON_SECRET for infra bootstrap.
 * - VERCEL_PROJECT_ID: from env, or discover via API (vowpath / effiroad.com)
 * - CRON_SECRET: from env, or read Vercel Production, or generate + upsert
 */
import { randomBytes } from "node:crypto";

const PROJECT_HINTS = ["vowpath", "effiroad"];

export function vercelToken() {
  return process.env.VERCEL_TOKEN?.trim() || "";
}

export function vercelTeamId() {
  return process.env.VERCEL_TEAM_ID?.trim() || "";
}

export async function vercelApi(path, method = "GET", body) {
  const token = vercelToken();
  if (!token) throw new Error("VERCEL_TOKEN not set");
  const teamId = vercelTeamId();
  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const res = await fetch(`https://api.vercel.com${path}${qs}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Vercel API ${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function listProjects() {
  const teamId = vercelTeamId();
  const path = teamId ? `/v9/projects?limit=50` : `/v9/projects?limit=50`;
  const { projects = [] } = await vercelApi(path);
  return projects;
}

function scoreProject(project) {
  const name = (project.name ?? "").toLowerCase();
  const link = (project.link ?? {}) ;
  const repo = (link.repo ?? "").toLowerCase();
  let score = 0;
  for (const hint of PROJECT_HINTS) {
    if (name.includes(hint)) score += 10;
    if (repo.includes(hint)) score += 10;
  }
  const aliases = (project.alias ?? []).map((a) => a.toLowerCase());
  if (aliases.some((a) => a.includes("effiroad.com"))) score += 50;
  return score;
}

export async function resolveProjectId() {
  const existing = process.env.VERCEL_PROJECT_ID?.trim();
  if (existing) return existing;
  if (!vercelToken()) return undefined;

  const projects = await listProjects();
  const ranked = projects
    .map((p) => ({ p, score: scoreProject(p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    const fallback = projects.find((p) => p.name);
    if (!fallback?.id) return undefined;
    console.log(`○ VERCEL_PROJECT_ID auto → ${fallback.id} (${fallback.name})`);
    process.env.VERCEL_PROJECT_ID = fallback.id;
    return fallback.id;
  }

  const { p, score } = ranked[0];
  console.log(`✓ VERCEL_PROJECT_ID auto → ${p.id} (${p.name}, score ${score})`);
  process.env.VERCEL_PROJECT_ID = p.id;
  if (p.accountId?.startsWith("team_") && !process.env.VERCEL_TEAM_ID?.trim()) {
    process.env.VERCEL_TEAM_ID = p.accountId;
    console.log(`✓ VERCEL_TEAM_ID auto → ${p.accountId}`);
  }
  return p.id;
}

function productionEnv(envs, key) {
  return envs.find(
    (e) =>
      e.key === key &&
      (e.target ?? []).some((t) => t === "production" || t === "preview" || t === "development"),
  );
}

function envQuery(extra = {}) {
  const teamId = vercelTeamId();
  const params = new URLSearchParams(extra);
  if (teamId) params.set("teamId", teamId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function vercelFetch(path) {
  const token = vercelToken();
  const res = await fetch(`https://api.vercel.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Vercel API GET ${path} → ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function listProjectEnv(projectId, { decrypt = false } = {}) {
  if (decrypt) {
    const json = await vercelFetch(
      `/v10/projects/${projectId}/env${envQuery({ decrypt: "true", source: "vercel-cli:pull" })}`,
    );
    return json.envs ?? [];
  }
  const json = await vercelApi(`/v10/projects/${projectId}/env`);
  return json.envs ?? [];
}

async function fetchEnvValue(projectId, envRow) {
  if (envRow?.value?.trim()) return envRow.value.trim();
  if (!envRow?.id) return undefined;

  const decryptedList = await listProjectEnv(projectId, { decrypt: true });
  const fromList = productionEnv(decryptedList, envRow.key ?? "CRON_SECRET");
  if (fromList?.value?.trim()) return fromList.value.trim();

  const detail = await vercelFetch(
    `/v10/projects/${projectId}/env/${envRow.id}${envQuery({ decrypt: "true", source: "vercel-cli:pull" })}`,
  );
  return detail?.value?.trim() || undefined;
}

async function externalCronsConfigured() {
  const apiKey = process.env.CRONJOB_ORG_API_KEY?.trim();
  if (!apiKey) return false;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://effiroad.com").replace(/\/$/, "");
  const paths = [
    "/api/cron/tech-dispatch",
    "/api/cron/giu-reservation-expiry",
    "/api/cron/toss-shop-sync",
  ];
  const res = await fetch("https://api.cron-job.org/jobs", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return false;
  const { jobs = [] } = await res.json().catch(() => ({}));
  return paths.every((path) => jobs.some((j) => j.url === `${baseUrl}${path}`));
}

async function rotateCronSecret(projectId, row) {
  const generated = randomBytes(32).toString("hex");
  const target = row.target?.length ? row.target : ["production", "preview"];
  await vercelApi(`/v10/projects/${projectId}/env/${row.id}`, "PATCH", {
    value: generated,
    type: row.type ?? "encrypted",
    target,
  });
  console.log(
    "✓ CRON_SECRET rotated on Vercel (UI cannot reveal encrypted values — cron-job.org gets the new secret)",
  );
  process.env.CRON_SECRET = generated;
  return { value: generated, rotated: true };
}

export async function triggerProductionRedeploy(projectId) {
  const hook = process.env.VERCEL_DEPLOY_HOOK?.trim();
  if (hook) {
    const res = await fetch(hook, { method: "POST" });
    if (!res.ok) throw new Error(`Deploy hook ${res.status}`);
    console.log("✓ Vercel deploy hook triggered");
    return;
  }
  try {
    await vercelApi("/v13/deployments", "POST", {
      name: "vowpath",
      project: projectId,
      target: "production",
    });
    console.log("✓ Vercel production redeploy triggered (API)");
  } catch (e) {
    console.log(`○ Redeploy pending — ${e instanceof Error ? e.message : e}`);
  }
}

export async function resolveCronSecret(projectId) {
  const existing = process.env.CRON_SECRET?.trim();
  if (existing) return { value: existing, rotated: false };

  if (!vercelToken() || !projectId) return { value: undefined, rotated: false };

  const envs = await listProjectEnv(projectId);
  const row = productionEnv(envs, "CRON_SECRET");

  if (row) {
    const value = await fetchEnvValue(projectId, row);
    if (value) {
      console.log("✓ CRON_SECRET loaded from Vercel Production");
      process.env.CRON_SECRET = value;
      return { value, rotated: false };
    }
    if (process.env.CRONJOB_ORG_API_KEY?.trim() && (await externalCronsConfigured())) {
      console.log("○ CRON_SECRET not readable — cron-job.org jobs already configured, skip rotate");
      return { value: undefined, rotated: false };
    }
    if (process.env.CRON_SECRET_ROTATE === "false") {
      console.log("○ CRON_SECRET not readable — set CRON_SECRET in GitHub or unset CRON_SECRET_ROTATE=false");
      return { value: undefined, rotated: false };
    }
    return rotateCronSecret(projectId, row);
  }

  const generated = randomBytes(32).toString("hex");
  await vercelApi(`/v10/projects/${projectId}/env`, "POST", {
    key: "CRON_SECRET",
    value: generated,
    type: "encrypted",
    target: ["production"],
  });
  console.log("✓ CRON_SECRET generated and saved to Vercel Production");
  process.env.CRON_SECRET = generated;
  return { value: generated, rotated: true };
}

/** Resolve project id + cron secret into process.env. Returns summary. */
export async function resolveInfraEnv() {
  const summary = {
    projectId: undefined,
    cronSecret: false,
    projectAuto: false,
    cronAuto: false,
    cronRotated: false,
  };

  const hadProject = Boolean(process.env.VERCEL_PROJECT_ID?.trim());
  const projectId = await resolveProjectId();
  summary.projectId = projectId;
  summary.projectAuto = Boolean(projectId && !hadProject);

  const hadCron = Boolean(process.env.CRON_SECRET?.trim());
  const cronResult = projectId
    ? await resolveCronSecret(projectId)
    : { value: process.env.CRON_SECRET?.trim(), rotated: false };
  summary.cronSecret = Boolean(cronResult.value);
  summary.cronAuto = Boolean(cronResult.value && !hadCron);
  summary.cronRotated = cronResult.rotated;

  return summary;
}
