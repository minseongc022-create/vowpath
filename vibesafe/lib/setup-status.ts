import "server-only";

import { isEncryptionConfigured } from "./crypto";
import { isDatabaseConfigured, prisma } from "./db";
import { isGithubAppConfigured } from "./github/app";
import { isAiConfigured, resolveProviderId } from "./ai/provider";
import { isEmailConfigured } from "@/lib/send-email";

/**
 * "지금 이 배포가 실제로 동작하는 상태인가"를 한눈에.
 *
 * ★ 값은 절대 내보내지 않는다
 *
 * 여기서 나가는 건 "설정됨/안 됨"과 우리가 쓴 한국어 안내뿐이다. 키의 앞
 * 네 글자조차 내보내지 않는다 — 설정 화면은 로그인 전에도 열려야 해서
 * (DB가 없으면 로그인 자체가 안 되니까) 공개 화면이라고 가정하고 만든다.
 */

export type CheckState = "ok" | "missing" | "optional";

export type SetupCheck = {
  key: string;
  label: string;
  state: CheckState;
  detail: string;
  /** 안 돼 있을 때 무엇을 해야 하는가 */
  fix?: string;
};

export type SetupStatus = {
  ready: boolean;
  /** 화면에 그대로 띄우는 한 줄. 화면이 상태를 다시 해석하지 않게 여기서 정한다. */
  headline: string;
  checks: SetupCheck[];
  /** DB가 붙어 있을 때만 채워진다 */
  runtime: {
    tablesReady: boolean;
    users: number;
    projects: number;
    queuedRuns: number;
    workerSeenAt: Date | null;
  } | null;
};

export async function getSetupStatus(): Promise<SetupStatus> {
  const checks: SetupCheck[] = [];

  const dbConfigured = isDatabaseConfigured();
  checks.push({
    key: "database",
    label: "데이터베이스",
    state: dbConfigured ? "ok" : "missing",
    detail: dbConfigured ? "연결 설정됨" : "VIBESAFE_DATABASE_URL이 없습니다",
    fix: "Vercel 환경변수에 VIBESAFE_DATABASE_URL을 추가하세요 (DATABASE_URL과 같은 값).",
  });

  const encryption = isEncryptionConfigured();
  checks.push({
    key: "encryption",
    label: "비밀값 암호화",
    state: encryption ? "ok" : "missing",
    detail: encryption ? "키 설정됨 (32바이트)" : "VIBESAFE_ENCRYPTION_KEY가 없거나 길이가 틀립니다",
    fix: "openssl rand -base64 32 로 만든 값을 VIBESAFE_ENCRYPTION_KEY에 넣으세요. 이게 없으면 GitHub 연결을 저장할 수 없습니다.",
  });

  const authSecret = Boolean(
    (process.env.VIBESAFE_AUTH_SECRET?.trim()?.length ?? 0) >= 32 ||
      (process.env.AUTH_SECRET?.trim()?.length ?? 0) >= 32,
  );
  checks.push({
    key: "auth",
    label: "로그인 세션 서명",
    state: authSecret ? "ok" : "missing",
    detail: authSecret ? "설정됨" : "VIBESAFE_AUTH_SECRET이 없거나 32자 미만입니다",
    fix: "openssl rand -base64 32 로 만든 값을 VIBESAFE_AUTH_SECRET에 넣으세요.",
  });

  const aiReady = isAiConfigured();
  checks.push({
    key: "ai",
    label: "AI 분석",
    state: aiReady ? "ok" : "missing",
    detail: aiReady ? `${resolveProviderId()} 사용` : "ANTHROPIC_API_KEY / OPENAI_API_KEY 둘 다 없습니다",
    fix: "둘 중 하나만 있으면 됩니다. 없으면 앱 분석이 동작하지 않습니다(흐름을 직접 입력하면 검사는 가능).",
  });

  const runnerToken = (process.env.VIBESAFE_RUNNER_TOKEN?.trim()?.length ?? 0) >= 24;
  checks.push({
    key: "runner",
    label: "브라우저 워커 인증",
    state: runnerToken ? "ok" : "missing",
    detail: runnerToken ? "토큰 설정됨" : "VIBESAFE_RUNNER_TOKEN이 없거나 24자 미만입니다",
    fix: "이 값이 없으면 워커가 검사를 가져갈 수 없어 검사가 큐에 계속 쌓입니다.",
  });

  checks.push({
    key: "github_app",
    label: "GitHub App",
    state: isGithubAppConfigured() ? "ok" : "optional",
    detail: isGithubAppConfigured()
      ? "설치형 연결 사용 가능 (읽기 전용)"
      : "설정되지 않음 — 사용자는 읽기 전용 토큰으로 연결합니다",
    fix: "VIBESAFE.md 3-3장 참고. 없어도 제품은 동작합니다.",
  });

  checks.push({
    key: "email",
    label: "이메일 알림",
    state: isEmailConfigured() ? "ok" : "optional",
    detail: isEmailConfigured() ? "Resend 설정됨" : "설정되지 않음 — 앱 안 알림만 동작합니다",
    fix: "RESEND_API_KEY를 추가하면 장애 시 이메일도 나갑니다.",
  });

  checks.push({
    key: "cron",
    label: "정기 검사 인증",
    state: process.env.CRON_SECRET?.trim() ? "ok" : "optional",
    detail: process.env.CRON_SECRET?.trim() ? "설정됨" : "설정되지 않음 — 운영에서는 필요합니다",
    fix: "CRON_SECRET이 없으면 운영 배포에서 정기 검사 엔드포인트가 503을 돌려줍니다.",
  });

  let runtime: SetupStatus["runtime"] = null;
  if (dbConfigured) {
    try {
      const [users, projects, queuedRuns, lastClaim] = await Promise.all([
        prisma.vibesafeUser.count(),
        prisma.vibesafeProject.count({ where: { archivedAt: null } }),
        prisma.vibesafeTestRun.count({ where: { status: { in: ["queued", "running"] } } }),
        prisma.vibesafeTestRun.findFirst({
          where: { claimedAt: { not: null } },
          orderBy: { claimedAt: "desc" },
          select: { claimedAt: true },
        }),
      ]);
      runtime = {
        tablesReady: true,
        users,
        projects,
        queuedRuns,
        workerSeenAt: lastClaim?.claimedAt ?? null,
      };
    } catch {
      // 테이블이 아직 없다 — db push를 안 한 상태.
      runtime = { tablesReady: false, users: 0, projects: 0, queuedRuns: 0, workerSeenAt: null };
    }
  }

  const missingCount = checks.filter((c) => c.state === "missing").length;
  const ready = missingCount === 0 && runtime?.tablesReady === true;

  // ★ "설정이 0개 남았습니다"가 나오지 않게 한다
  //
  // 환경변수를 다 넣었는데 `db push`를 안 한 상태 — 새로 배포하는 사람이
  // 정확히 밟는 자리다. 여기서 "0개 남았습니다"라고 하면 뭘 해야 할지
  // 알 수 없다. 남은 일을 이름으로 말해준다.
  let headline: string;
  if (ready) {
    headline = "사용할 준비가 되었습니다";
  } else if (missingCount > 0) {
    headline = `설정이 ${missingCount}개 남았습니다`;
  } else if (runtime && !runtime.tablesReady) {
    headline = "데이터베이스 테이블을 만들어야 합니다";
  } else {
    headline = "데이터베이스에 연결되지 않았습니다";
  }

  return { ready, headline, checks, runtime };
}
