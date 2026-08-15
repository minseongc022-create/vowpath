/**
 * Giu pickup SMS — Vietnam (+84) via dedicated Twilio from-number.
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
  const amount = new Intl.NumberFormat("vi-VN").format(input.totalVnd);
  const body =
    `[Giu] Mã cứu đồ: ${input.code}\n` +
    `${input.merchantName} · ${amount}₫\n` +
    `Nhận: ${input.pickupWindow}\n` +
    `giucuu.com/ma-cua-toi`;
  return sendGiuPickupSms(input.phone, body);
}

function isGiuSmsPreview(): boolean {
  const v = process.env.GIU_SMS_PREVIEW?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function normalizeVnPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("84")) return `+${digits}`;
  if (digits.startsWith("0")) return `+84${digits.slice(1)}`;
  if (raw.trim().startsWith("+")) return raw.trim();
  return `+84${digits}`;
}
