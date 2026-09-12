import { encryptSecret, isEncryptionConfigured, randomToken } from "@/vibesafe/lib/crypto";
import { prisma } from "@/vibesafe/lib/db";
import { fail, ok, requireSession } from "@/vibesafe/lib/http";
import { assertProjectOwner } from "@/vibesafe/lib/projects";

/**
 * 저장소 webhook 비밀 발급.
 *
 * GitHub App으로 연결한 사람은 앱 수준 webhook이 이미 돌아가므로 필요 없다.
 * 토큰(PAT)으로 연결한 사람이 "push하면 바로 검사" 를 쓰려면 저장소 설정에
 * webhook을 직접 추가해야 해서, 그때 붙일 비밀을 여기서 만들어준다.
 *
 * 비밀은 **만들 때 한 번만** 평문으로 돌려준다. 다시 볼 수 없고, 잃어버리면
 * 새로 발급한다 — 다시 보여줄 수 있으면 암호화해서 저장한 의미가 없다.
 */
export async function POST(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }
  if (!isEncryptionConfigured()) {
    return fail("서버에 암호화 키가 설정되지 않아 webhook 비밀을 만들 수 없습니다.", 503);
  }

  const secret = randomToken(24);
  await prisma.vibesafeRepositoryConnection.update({
    where: { projectId },
    data: { webhookSecretCipher: encryptSecret(secret) },
  });
  return ok({ secret });
}

export const dynamic = "force-dynamic";
