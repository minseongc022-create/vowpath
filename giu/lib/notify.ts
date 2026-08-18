/**
 * Giu pickup SMS — Korea (+82) via Twilio.
 * Set GIU_TWILIO_FROM (e.g. Twilio number with VN geo enabled).
 */
export async function sendGiuPickupSms(
  phoneRaw: string,
  body: string,
): Promise<{ ok: boolean; skipped?: boolean }> {
  const phone = normalizeVnPhone(phoneRaw);
  if (!phone) {
    console.warn("[giu-sms] invalid phone", phoneRaw);
    return { ok: false };
  }

  if (process.env.NODE_ENV !== "production" && isGiuSmsPreview()) {
    console.info(`[giu-sms] preview → ${phone}: ${body}`);
    return { ok: true, skipped: true };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from =
    process.env.GIU_TWILIO_FROM?.trim() || process.env.TWILIO_PHONE_NUMBER?.trim();

  if (!sid || !token || !from) {
    console.info(`[giu-sms] no Twilio config — log only → ${phone}: ${body}`);
    return { ok: true, skipped: true };
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(sid, token);
    await client.messages.create({ body, from, to: phone });
    return { ok: true };
  } catch (e) {
    console.warn("[giu-sms] send failed", e);
    return { ok: false };
  }
}

export async function notifyPickupCode(input: {
  phone: string;
  code: string;
  merchantName: string;
  totalVnd: number;
  pickupWindow: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const amount = new Intl.NumberFormat("ko-KR").format(input.totalVnd);
  const body =
    `[Giu] 결제 완료 · 앱에서 픽업 QR을 보여주세요\n` +
    `${input.merchantName} · ${amount}원\n` +
    `픽업: ${input.pickupWindow}\n` +
    `giucuu.com`;
  return sendGiuPickupSms(input.phone, body);
}

export async function notifyMerchantNewOrder(input: {
  phone: string;
  customerName: string;
  boxTitle: string;
  totalVnd: number;
  quantity: number;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const amount = new Intl.NumberFormat("ko-KR").format(input.totalVnd);
  const body =
    `[Giu] 새 주문 · ${input.customerName}\n` +
    `${input.boxTitle} · ${input.quantity}개 · ${amount}원\n` +
    `가게 앱에서 픽업 확인하세요\n` +
    `giucuu.com/hop`;
  return sendGiuPickupSms(input.phone, body);
}

function isGiuSmsPreview(): boolean {
  const v = process.env.GIU_SMS_PREVIEW?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function normalizeVnPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("82")) return `+${digits}`;
  if (digits.startsWith("010") || digits.startsWith("011")) return `+82${digits.slice(1)}`;
  if (digits.startsWith("84")) return `+${digits}`;
  if (digits.startsWith("0")) return `+82${digits.slice(1)}`;
  if (raw.trim().startsWith("+")) return raw.trim();
  return `+82${digits}`;
}
