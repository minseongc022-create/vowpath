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
