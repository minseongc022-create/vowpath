import { GithubError } from "@/vibesafe/lib/github/client";
import { listConnectedRepos } from "@/vibesafe/lib/github/connection";
import { fail, ok, requireSession } from "@/vibesafe/lib/http";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const repos = await listConnectedRepos(auth.session.userId);
    return ok({
      repos: repos.map((r) => ({
        fullName: r.fullName,
        owner: r.owner,
        name: r.name,
        private: r.private,
        defaultBranch: r.defaultBranch,
        description: r.description,
        pushedAt: r.pushedAt,
      })),
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "GITHUB_NOT_CONNECTED") return fail("GitHub이 연결되어 있지 않습니다.", 409);
    if (error instanceof GithubError) return fail(error.message, 502);
    console.error("[vibesafe] list repos failed:", message);
    return fail("저장소 목록을 가져오지 못했습니다.", 502);
  }
}

export const dynamic = "force-dynamic";
