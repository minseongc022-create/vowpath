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
  return p.id;
}

async function listProjectEnv(projectId) {
  const json = await vercelApi(`/v10/projects/${projectId}/env`);
  return json.envs ?? [];
}

function productionEnv(envs, key) {
  return envs.find(
    (e) =>
      e.key === key &&
      (e.target ?? []).some((t) => t === "production" || t === "preview" || t === "development"),
  );
}

export async function resolveCronSecret(projectId) {
  const existing = process.env.CRON_SECRET?.trim();
  if (existing) return existing;

  if (!vercelToken() || !projectId) return undefined;

  const envs = await listProjectEnv(projectId);
  const row = productionEnv(envs, "CRON_SECRET");
  if (row?.value?.trim()) {
    const value = row.value.trim();
    console.log("✓ CRON_SECRET loaded from Vercel Production");
    process.env.CRON_SECRET = value;
    return value;
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
  return generated;
}

/** Resolve project id + cron secret into process.env. Returns summary. */
export async function resolveInfraEnv() {
  const summary = { projectId: undefined, cronSecret: false, projectAuto: false, cronAuto: false };

  const hadProject = Boolean(process.env.VERCEL_PROJECT_ID?.trim());
  const projectId = await resolveProjectId();
  summary.projectId = projectId;
  summary.projectAuto = Boolean(projectId && !hadProject);

  const hadCron = Boolean(process.env.CRON_SECRET?.trim());
  const cron = projectId ? await resolveCronSecret(projectId) : process.env.CRON_SECRET?.trim();
  summary.cronSecret = Boolean(cron);
  summary.cronAuto = Boolean(cron && !hadCron);

  return summary;
}
