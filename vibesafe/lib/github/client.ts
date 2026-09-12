import "server-only";

const GITHUB_API = "https://api.github.com";

export type GithubRepo = {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  private: boolean;
  defaultBranch: string;
  pushedAt: string | null;
  description: string | null;
};

export type GithubTreeEntry = { path: string; type: "blob" | "tree"; size: number; sha: string };

export class GithubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "GithubError";
  }
}

/**
 * GitHub REST 호출 한 자리.
 *
 * ★ 토큰은 절대 에러 메시지나 로그에 싣지 않는다. 이 파일 밖으로 나가는 건
 *   상태 코드와 우리가 쓴 한국어 문장뿐이다.
 */
async function githubFetch(token: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "VibeSafe",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
}

function humanError(status: number): string {
  if (status === 401) return "GitHub 인증이 만료되었습니다. 다시 연결해주세요.";
  if (status === 403) return "GitHub 접근 권한이 없습니다. 저장소 접근을 허용했는지 확인해주세요.";
  if (status === 404) return "저장소를 찾을 수 없습니다. 접근이 허용된 저장소인지 확인해주세요.";
  if (status === 429) return "GitHub 요청 한도에 걸렸습니다. 잠시 후 다시 시도해주세요.";
  return "GitHub 연결에 실패했습니다. 잠시 후 다시 시도해주세요.";
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new GithubError(res.status, humanError(res.status));
  return (await res.json()) as T;
}

type RawRepo = {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string };
  private: boolean;
  default_branch: string;
  pushed_at: string | null;
  description: string | null;
};

function toRepo(raw: RawRepo): GithubRepo {
  return {
    id: raw.id,
    fullName: raw.full_name,
    owner: raw.owner.login,
    name: raw.name,
    private: raw.private,
    defaultBranch: raw.default_branch || "main",
    pushedAt: raw.pushed_at,
    description: raw.description,
  };
}

/** 토큰이 누구인지 — 연결 화면에 "○○ 계정으로 연결됨"을 보여주기 위한 최소 정보. */
export async function getViewer(token: string): Promise<{ login: string; id: number }> {
  const data = await json<{ login: string; id: number }>(await githubFetch(token, "/user"));
  return { login: data.login, id: data.id };
}

/** PAT로 접근 가능한 저장소. 최근에 푸시된 순으로 100개까지만 — 고르기용이다. */
export async function listUserRepos(token: string): Promise<GithubRepo[]> {
  const data = await json<RawRepo[]>(
    await githubFetch(token, "/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member"),
  );
  return data.map(toRepo);
}

/** GitHub App 설치에 허용된 저장소 — 사용자가 설치할 때 직접 고른 목록이다. */
export async function listInstallationRepos(token: string): Promise<GithubRepo[]> {
  const data = await json<{ repositories: RawRepo[] }>(
    await githubFetch(token, "/installation/repositories?per_page=100"),
  );
  return data.repositories.map(toRepo);
}

export async function getRepo(token: string, owner: string, repo: string): Promise<GithubRepo> {
  return toRepo(await json<RawRepo>(await githubFetch(token, `/repos/${owner}/${repo}`)));
}

/** 기본 브랜치의 최신 커밋 sha — 재분석이 필요한지 판단하는 값. */
export async function getHeadSha(token: string, owner: string, repo: string, branch: string): Promise<string | null> {
  const res = await githubFetch(token, `/repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { sha?: string };
  return data.sha ?? null;
}

/**
 * 저장소 파일 목록(재귀).
 *
 * 한 번에 전체 트리를 받는 이유는 파일마다 API를 치면 큰 저장소에서 수백 번
 * 요청이 나가기 때문이다. GitHub은 트리가 너무 크면 `truncated: true`로
 * 잘라서 주는데, 그때는 잘린 목록으로 최선을 다한다(우리가 보는 건 어차피
 * 라우트/설정 파일 몇십 개뿐이다).
 */
export async function listTree(
  token: string,
  owner: string,
  repo: string,
  sha: string,
): Promise<{ entries: GithubTreeEntry[]; truncated: boolean }> {
  const data = await json<{
    tree: { path: string; type: string; size?: number; sha: string }[];
    truncated?: boolean;
  }>(await githubFetch(token, `/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`));
  return {
    entries: data.tree
      .filter((e) => e.type === "blob" || e.type === "tree")
      .map((e) => ({ path: e.path, type: e.type as "blob" | "tree", size: e.size ?? 0, sha: e.sha })),
    truncated: Boolean(data.truncated),
  };
}

/** 파일 한 개의 내용. 바이너리/대용량은 호출자가 거르고 들어온다. */
export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<string | null> {
  const res = await githubFetch(
    token,
    `/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: string; encoding?: string; size?: number };
  if (!data.content || data.encoding !== "base64") return null;
  return Buffer.from(data.content, "base64").toString("utf8");
}
