import { getConnection, disconnect } from "@/vibesafe/lib/github/connection";
import { isGithubAppConfigured } from "@/vibesafe/lib/github/app";
import { isEncryptionConfigured } from "@/vibesafe/lib/crypto";
import { ok, requireSession } from "@/vibesafe/lib/http";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const connection = await getConnection(auth.session.userId);
  return ok({
    connection: connection ? { login: connection.login, authKind: connection.authKind } : null,
    appAvailable: isGithubAppConfigured(),
    patAvailable: isEncryptionConfigured(),
  });
}

export async function DELETE() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  await disconnect(auth.session.userId);
  return ok({});
}

export const dynamic = "force-dynamic";
