import { createHmac } from "node:crypto";

const VNPAY_SANDBOX = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

export function isVnpayConfigured(): boolean {
  return Boolean(
    process.env.VNPAY_TMN_CODE?.trim() && process.env.VNPAY_HASH_SECRET?.trim(),
  );
}

/** Instant success when demo flag set or VNPay env missing (local dev). */
export function isGiuPaymentDemo(): boolean {
  const flag = process.env.GIU_PAYMENT_DEMO?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return !isVnpayConfigured();
}

function vnpaySecret(): string {
  return process.env.VNPAY_HASH_SECRET?.trim() ?? "";
}

function formatVnpayDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function sortParams(params: Record<string, string>): Record<string, string> {
  return Object.keys(params)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      acc[key] = params[key] ?? "";
      return acc;
    }, {});
}

function signParams(params: Record<string, string>): string {
  const sorted = sortParams(params);
  const signData = new URLSearchParams(sorted).toString();
  return createHmac("sha512", vnpaySecret()).update(signData).digest("hex");
}

export function buildVnpayPaymentUrl(input: {
  amountVnd: number;
  txnRef: string;
  orderInfo: string;
  ipAddr: string;
  returnUrl: string;
}): string {
  const tmnCode = process.env.VNPAY_TMN_CODE!.trim();
  const baseUrl = process.env.VNPAY_URL?.trim() || VNPAY_SANDBOX;
  const now = new Date();
  const expire = new Date(now.getTime() + 15 * 60 * 1000);

  const params: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: String(input.amountVnd * 100),
    vnp_CurrCode: "VND",
    vnp_TxnRef: input.txnRef.slice(0, 100),
    vnp_OrderInfo: input.orderInfo.slice(0, 255),
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: input.returnUrl,
    vnp_IpAddr: input.ipAddr,
    vnp_CreateDate: formatVnpayDate(now),
    vnp_ExpireDate: formatVnpayDate(expire),
  };

  const sorted = sortParams(params);
  const query = new URLSearchParams(sorted).toString();
  const secureHash = signParams(params);
  return `${baseUrl}?${query}&vnp_SecureHash=${secureHash}`;
}

export type VnpayCallbackResult = {
  valid: boolean;
  success: boolean;
  txnRef: string;
  amountVnd: number;
  transactionNo?: string;
  responseCode: string;
};

export function verifyVnpayCallback(
  query: Record<string, string | undefined>,
): VnpayCallbackResult {
  const secureHash = query.vnp_SecureHash ?? "";
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (!value || key === "vnp_SecureHash" || key === "vnp_SecureHashType") continue;
    params[key] = value;
  }

  const expected = signParams(params);
  const valid = secureHash.length > 0 && expected === secureHash;
  const responseCode = query.vnp_ResponseCode ?? "";
  const txnRef = query.vnp_TxnRef ?? "";
  const amountVnd = Math.round(Number(query.vnp_Amount ?? 0) / 100);
  const success = valid && responseCode === "00";

  return {
    valid,
    success,
    txnRef,
    amountVnd,
    transactionNo: query.vnp_TransactionNo,
    responseCode,
  };
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "127.0.0.1";
  return "127.0.0.1";
}
