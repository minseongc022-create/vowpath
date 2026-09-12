import { enforceRateLimit, fail, ok, requireSession } from "@/vibesafe/lib/http";
import { getOwnedProject } from "@/vibesafe/lib/projects";
import { listSecurityProbes, scanProjectSecurity } from "@/vibesafe/lib/security/scan-runner";

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  const project = await getOwnedProject(auth.session.userId, projectId);
  if (!project) return fail("프로젝트를 찾을 수 없습니다.", 404);
  return ok({ probes: await listSecurityProbes(projectId) });
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  const project = await getOwnedProject(auth.session.userId, projectId);
  if (!project) return fail("프로젝트를 찾을 수 없습니다.", 404);

  const baseUrl = project.deploymentTargets.find((t) => t.kind === "production")?.baseUrl;
  if (!baseUrl) return fail("서비스 주소가 등록되어 있지 않습니다.", 400);

  // 남의 서버에 요청을 보내는 일이라 한도를 건다.
  const limited = await enforceRateLimit({
    request, scope: "security-probe", limit: 6, windowSeconds: 3600, identity: auth.session.userId,
  });
  if (limited) return limited;

  const result = await scanProjectSecurity({ projectId, baseUrl });
  return ok({ result });
}

export const dynamic = "force-dynamic";
export const maxDuration = 120;
