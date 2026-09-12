import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * GitHub webhook 서명 검증.
 *
 * ★ 이걸 빼먹으면 누구나 우리 endpoint에 "푸시가 일어났다"고 거짓말할 수 있고,
 *   그러면 남의 계정에서 검사를 무한히 돌려 사용량을 태울 수 있다. 서명이
 *   없으면 받지 않는다 — "일단 받고 나중에" 같은 임시 경로를 두지 않는다.
 */
export function verifyGithubSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
}): boolean {
  const { rawBody, signatureHeader, secret } = params;
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type GithubPushEvent = {
  repositoryFullName: string;
  headSha: string | null;
  branch: string | null;
};

/** push 이벤트에서 우리가 쓰는 것만 뽑는다. */
export function parsePushEvent(payload: unknown): GithubPushEvent | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as {
    repository?: { full_name?: string };
    after?: string;
    ref?: string;
  };
  const fullName = p.repository?.full_name;
  if (!fullName) return null;
  return {
    repositoryFullName: fullName,
    headSha: typeof p.after === "string" && /^[0-9a-f]{7,40}$/.test(p.after) ? p.after : null,
    branch: typeof p.ref === "string" && p.ref.startsWith("refs/heads/") ? p.ref.slice(11) : null,
  };
}

export type DeploymentStatusEvent = { url: string; branch: string; environment: string };

/**
 * Vercel 프리뷰 배포 완료 이벤트.
 *
 * Vercel의 GitHub 연동이 배포를 마치면 `deployment_status`를 보낸다. 여기서
 * 프리뷰 주소를 얻어 머지 전 검사를 돌린다 — 운영에 나가기 전에 잡는 유일한 기회다.
 */
/**
 * 운영 배포가 끝났다는 신호.
 *
 * ★ push가 아니라 배포 완료를 기다리는 이유
 *
 * 머지하면 push 이벤트가 곧바로 온다. 그때 검사를 돌리면 아직 **예전 배포**를
 * 보고 있다 — 고친 코드가 아직 나가지 않았는데 "여전히 안 됨"이라고 적히고,
 * 멀쩡한 수정이 실패로 기록된다. 그래서 수정 적용 뒤의 확인만은 배포 완료
 * 신호를 기다린다.
 */
export type ProductionDeploymentEvent = { url: string | null; ref: string; sha: string | null };

export function parseProductionDeploymentEvent(payload: unknown): ProductionDeploymentEvent | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as {
    deployment_status?: { state?: string; environment_url?: string; target_url?: string; environment?: string };
    deployment?: { ref?: string; sha?: string; environment?: string };
  };
  const status = p.deployment_status;
  if (!status || status.state !== "success") return null;

  const environment = (status.environment ?? p.deployment?.environment ?? "").toLowerCase();
  if (!environment.includes("production")) return null;

  const ref = p.deployment?.ref;
  if (!ref) return null;
  const url = status.environment_url ?? status.target_url ?? null;
  return { url: url && /^https:\/\//.test(url) ? url : null, ref, sha: p.deployment?.sha ?? null };
}

export function parseDeploymentStatusEvent(payload: unknown): DeploymentStatusEvent | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as {
    deployment_status?: { state?: string; environment_url?: string; target_url?: string; environment?: string };
    deployment?: { ref?: string; environment?: string };
  };

  const status = p.deployment_status;
  if (!status || status.state !== "success") return null;

  const environment = (status.environment ?? p.deployment?.environment ?? "").toLowerCase();
  // 운영 배포는 여기서 다루지 않는다 — 그건 push 이벤트 쪽 일이다.
  if (environment.includes("production")) return null;

  const url = status.environment_url ?? status.target_url;
  const branch = p.deployment?.ref;
  if (!url || !branch) return null;
  if (!/^https:\/\//.test(url)) return null;

  return { url, branch, environment: environment || "preview" };
}
