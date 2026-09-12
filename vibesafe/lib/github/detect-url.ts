import "server-only";

import { getRepo } from "./client";
import { validateServiceUrl } from "../url-safety";

/**
 * 배포 주소를 저장소에서 알아낸다.
 *
 * ★ 왜 이게 연결 경험의 핵심인가
 *
 * 지금까지 사용자는 "배포 주소를 입력하세요"라는 빈 칸을 만났다. 별것
 * 아닌 것 같지만 여기서 사람들이 멈춘다 — 주소를 정확히 기억 못 하거나,
 * `https://`를 빼먹거나, Vercel 대시보드를 열러 갔다가 안 돌아온다.
 *
 * 그런데 그 정보는 대부분 **이미 GitHub에 있다.** Vercel·Netlify를 GitHub에
 * 연결해두면 배포할 때마다 저장소의 homepage 칸과 Deployments를 자기들이
 * 채워 넣는다. 바이브코딩으로 만든 앱은 거의 다 이 경로로 배포된다.
 * 그러니 묻지 말고 찾아서 보여주고, 맞는지만 확인받으면 된다.
 *
 * ★ 찾았다고 그대로 믿지는 않는다
 *
 * 여기서 나온 주소도 사용자가 직접 입력한 것과 똑같이 SSRF 검사를 통과해야
 * 한다. GitHub에 적혀 있다고 안전한 주소인 것은 아니다 — 저장소 설정은
 * 누구나 바꿀 수 있고, 우리 워커는 그 주소로 실제 요청을 보낸다.
 */

export type UrlCandidate = {
  url: string;
  /** deployment: 실제 배포 기록 · homepage: 저장소에 적힌 주소 */
  source: "deployment" | "homepage";
  /** 화면에 그대로 보여줄 설명 */
  label: string;
};

type RawDeployment = { id: number; environment: string };
type RawStatus = { state: string; environment_url?: string | null; target_url?: string | null };

const API = "https://api.github.com";

async function gh<T>(token: string, path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "VibeSafe",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // 주소를 못 찾는 것은 실패가 아니다 — 사용자가 직접 넣으면 된다.
    return null;
  }
}

/** 운영 환경으로 올라간 마지막 배포의 주소. 가장 믿을 만한 신호다. */
async function fromDeployments(
  token: string,
  owner: string,
  repo: string,
): Promise<UrlCandidate | null> {
  const deployments = await gh<RawDeployment[]>(
    token,
    `/repos/${owner}/${repo}/deployments?per_page=10`,
  );
  if (!deployments?.length) return null;

  // production 환경을 먼저 본다. 없으면 가장 최근 배포를 본다 —
  // 환경 이름을 "Production"으로 대문자로 쓰는 팀도 있다.
  const ordered = [
    ...deployments.filter((d) => /production/i.test(d.environment ?? "")),
    ...deployments.filter((d) => !/production|preview/i.test(d.environment ?? "")),
  ];

  for (const deployment of ordered.slice(0, 5)) {
    const statuses = await gh<RawStatus[]>(
      token,
      `/repos/${owner}/${repo}/deployments/${deployment.id}/statuses?per_page=5`,
    );
    const success = statuses?.find((s) => s.state === "success");
    const url = success?.environment_url ?? success?.target_url;
    if (url) return { url, source: "deployment", label: "최근 배포에서 찾았습니다" };
  }
  return null;
}

/**
 * 후보를 모아 돌려준다. 앞에 있을수록 믿을 만하다.
 * 안전 검사를 통과한 것만, 중복 없이 돌려준다.
 */
export async function detectProductionUrl(
  token: string,
  owner: string,
  repo: string,
): Promise<UrlCandidate[]> {
  const found: UrlCandidate[] = [];

  const deployment = await fromDeployments(token, owner, repo);
  if (deployment) found.push(deployment);

  const info = await getRepo(token, owner, repo).catch(() => null);
  if (info?.homepage) {
    found.push({
      url: info.homepage,
      source: "homepage",
      label: "저장소에 적힌 주소입니다",
    });
  }

  const seen = new Set<string>();
  const safe: UrlCandidate[] = [];
  for (const candidate of found) {
    const raw = candidate.url.trim();
    // 사람들은 주소창에서 복사할 때 프로토콜을 빼먹는다. 우리가 붙여준다.
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const check = validateServiceUrl(withScheme);
    if (!check.ok) continue;
    if (seen.has(check.url)) continue;
    seen.add(check.url);
    safe.push({ ...candidate, url: check.url });
  }
  return safe;
}
