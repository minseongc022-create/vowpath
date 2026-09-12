import { z } from "zod";
import { fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import {
  getPermissions,
  getTrustScore,
  listActionLog,
  setPermission,
  type PermissionKey,
} from "@/vibesafe/lib/permissions";
import { assertProjectOwner } from "@/vibesafe/lib/projects";
import { getWriteConnection, isFixAppConfigured } from "@/vibesafe/lib/github/write-connection";
import { getVercelConnection } from "@/vibesafe/lib/repair/rollback";

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }

  const [permissions, trust, actionLog, writeConnection, vercel] = await Promise.all([
    getPermissions(projectId),
    getTrustScore(projectId),
    listActionLog(projectId, 30),
    getWriteConnection(auth.session.userId),
    getVercelConnection(auth.session.userId),
  ]);

  return ok({
    permissions,
    trust,
    actionLog,
    // 켤 수 있는지 여부 — 연결이 없으면 화면에서 미리 안내한다.
    canEnable: {
      diagnose: true,
      proposePr: Boolean(writeConnection),
      rollback: Boolean(vercel),
    },
    connections: {
      githubWrite: writeConnection ? { login: writeConnection.login } : null,
      vercel: vercel ? { login: vercel.login } : null,
      fixAppAvailable: isFixAppConfigured(),
    },
  });
}

const schema = z.object({
  key: z.enum(["diagnose", "proposePr", "rollback"]),
  enabled: z.boolean(),
});

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("입력값을 확인해주세요.");

  // ★ 필요한 연결 없이는 권한을 켤 수 없다. 화면만 막으면 API로 뚫린다.
  if (parsed.data.enabled && parsed.data.key === "proposePr") {
    if (!(await getWriteConnection(auth.session.userId))) {
      return fail("수정 권한이 있는 GitHub 연결을 먼저 추가해주세요.", 409);
    }
  }
  if (parsed.data.enabled && parsed.data.key === "rollback") {
    if (!(await getVercelConnection(auth.session.userId))) {
      return fail("Vercel 연결을 먼저 추가해주세요.", 409);
    }
  }

  const permissions = await setPermission({
    projectId,
    key: parsed.data.key as PermissionKey,
    enabled: parsed.data.enabled,
    actor: auth.session.email || "user",
  });
  return ok({ permissions });
}

export const dynamic = "force-dynamic";
