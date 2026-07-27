/**
 * Server-side Solapi Alimtalk.
 * Env (see docs/ALIMTALK_SETUP.md):
 *   SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_FROM
 *   SOLAPI_PF_ID, SOLAPI_TEMPLATE_ID
 * Optional: SOLAPI_DISABLE_SMS=true to skip SMS failover
 */

export type AlimtalkSendInput = {
  to: string;
  officeName: string;
  clientName: string;
  contactName: string;
  monthLabel: string;
  docsLabel: string;
  submitUrl: string;
  replyUrl: string;
  stepLabel?: string;
};

export type AlimtalkSendResult =
  | { ok: true; mode: "live"; groupId?: string; messageId?: string }
  | { ok: true; mode: "practice"; reason: string }
  | { ok: false; mode: "live" | "practice"; error: string };

function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function getAlimtalkConfig() {
  const apiKey = process.env.SOLAPI_API_KEY?.trim() || "";
  const apiSecret = process.env.SOLAPI_API_SECRET?.trim() || "";
  const from = digits(process.env.SOLAPI_FROM || "");
  const pfId = process.env.SOLAPI_PF_ID?.trim() || "";
  const templateId = process.env.SOLAPI_TEMPLATE_ID?.trim() || "";
  const disableSms = process.env.SOLAPI_DISABLE_SMS === "true";
  const configured = Boolean(apiKey && apiSecret && from && pfId && templateId);
  return { apiKey, apiSecret, from, pfId, templateId, disableSms, configured };
}

export function alimtalkStatusPublic() {
  const c = getAlimtalkConfig();
  return {
    configured: c.configured,
    fromMasked: c.from ? `${c.from.slice(0, 3)}****${c.from.slice(-2)}` : null,
    smsFailover: c.configured && !c.disableSms,
    templateReady: Boolean(c.templateId),
  };
}

export async function sendAlimtalk(
  input: AlimtalkSendInput,
  opts?: { forcePractice?: boolean },
): Promise<AlimtalkSendResult> {
  const cfg = getAlimtalkConfig();
  const to = digits(input.to);
  if (!to || to.length < 10) {
    return { ok: false, mode: cfg.configured ? "live" : "practice", error: "수신 번호가 올바르지 않습니다" };
  }

  if (opts?.forcePractice || !cfg.configured) {
    return {
      ok: true,
      mode: "practice",
      reason: opts?.forcePractice
        ? "실발송이 꺼져 있어 연습 모드로 처리했습니다"
        : "솔라피 환경변수가 없어 연습 모드로 처리했습니다",
    };
  }

  try {
    const { SolapiMessageService } = await import("solapi");
    const service = new SolapiMessageService(cfg.apiKey, cfg.apiSecret);
    const result = await service.send({
      to,
      from: cfg.from,
      kakaoOptions: {
        pfId: cfg.pfId,
        templateId: cfg.templateId,
        disableSms: cfg.disableSms,
        variables: {
          "#{사무소명}": input.officeName,
          "#{상호}": input.clientName,
          "#{담당자}": input.contactName || "담당자",
          "#{월}": input.monthLabel,
          "#{자료목록}": input.docsLabel,
          "#{제출링크}": input.submitUrl,
          "#{회신링크}": input.replyUrl,
          "#{단계}": input.stepLabel || "자료 요청",
        },
      },
    });

    const groupId =
      result && typeof result === "object" && "groupId" in result
        ? String((result as { groupId?: string }).groupId || "")
        : undefined;
    return { ok: true, mode: "live", groupId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "알림톡 발송 실패";
    return { ok: false, mode: "live", error: message };
  }
}

export async function sendAlimtalkMany(
  inputs: AlimtalkSendInput[],
  opts?: { forcePractice?: boolean },
): Promise<{
  results: AlimtalkSendResult[];
  liveCount: number;
  practiceCount: number;
  failCount: number;
}> {
  const results: AlimtalkSendResult[] = [];
  for (const input of inputs) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await sendAlimtalk(input, opts));
  }
  return {
    results,
    liveCount: results.filter((r) => r.ok && r.mode === "live").length,
    practiceCount: results.filter((r) => r.ok && r.mode === "practice").length,
    failCount: results.filter((r) => !r.ok).length,
  };
}
