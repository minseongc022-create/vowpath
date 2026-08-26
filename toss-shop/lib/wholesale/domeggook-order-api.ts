/**
 * 도매꾹/도매매 발주 API — 진짜 돈이 나가는 곳
 *
 * ★ 이게 나오기까지
 *
 * 처음엔 "도매매는 발주 API가 없다"고 결론 내렸다. 공개 문서만 보고 내린
 * 판단이었다. 실제로는 **Private API**라는 승인제 등급 뒤에 있었다 —
 * 사장님 계정이 승인된 뒤에야 `setOrder`(주문서 생성)가 문서에 나타났다.
 * 없다고 단정하기 전에 승인 절차가 있는지부터 확인했어야 했다.
 *
 * ★ 구조
 *
 *  1. setLogin(id, pw) → sId(세션), cId 발급
 *  2. getMyAsset(sId)  → 이머니 잔액 확인
 *  3. setOrder(sId, item[], deliinfo) → 주문서 생성, **이머니 즉시 차감**
 *
 * API 키만으로는 안 된다 — 로그인 세션이 있어야 한다. 세션은 저장해두지
 * 않고 **주문을 넣을 때마다 새로 로그인**한다. 발주 빈도가 낮아서(10분에
 * 몇 건) 세션 재사용의 이점보다, 세션 관리 버그로 오래된 세션을 쓰다 실패할
 * 위험을 피하는 쪽이 낫다.
 *
 * ★ 되돌릴 수 없다
 *
 * 주문서 생성이 성공하는 순간 이머니가 빠진다. 반품/취소 API가 있긴 하지만
 * 그것도 별도 절차고 수수료가 붙을 수 있다. 그래서 이 파일의 모든 함수는
 * 실패를 절대 삼키지 않고, 성공도 절대 지어내지 않는다 — 응답에
 * `result: "SUCCESS"`와 `orderNo`가 실제로 있을 때만 성공으로 본다.
 */

const API_BASE = "https://www.domeggook.com/ssl/api/";

export const DOMEGGOOK_ORDER_API_VERSION = "1.0";

function getAccountCreds(): { id: string; pw: string; aid: string } | null {
  const id = process.env.DOMEGGOOK_ACCOUNT_ID?.trim();
  const pw = process.env.DOMEGGOOK_ACCOUNT_PW?.trim();
  const aid = process.env.DOMEGGOOK_API_KEY?.trim();
  if (!id || !pw || !aid) return null;
  return { id, pw, aid };
}

export function isDomeggookOrderingConfigured(): boolean {
  return getAccountCreds() != null;
}

/** 도매꾹 표준 오류 응답 — 검색 API와 같은 모양이라 판독을 그대로 재사용한다 */
type DomeErrorEnvelope = {
  errors?: { code?: string; dcode?: string; message?: string; dmessage?: string };
};

function readError(data: unknown): { code: string; message: string } | null {
  const err = (data as DomeErrorEnvelope | null)?.errors;
  if (!err) return null;
  return {
    code: err.dcode || err.code || "UNKNOWN",
    message: err.dmessage || err.message || "도매꾹이 오류를 돌려줬습니다",
  };
}

/**
 * 잔액 부족으로 실패한 것인지 판별한다.
 *
 * 정확한 오류 코드를 문서에서 확인하지 못했다 — 승인 전이라 실제로 잔액
 * 부족 상황을 만들어 테스트할 수 없었다. 그래서 메시지 키워드로 판별한다.
 * 이 판별이 틀려도 큰 문제는 아니다: 놓치면 그냥 일반 실패로 보고되고
 * 사장님이 원문 메시지를 그대로 보게 될 뿐, 잘못된 주문이 나가지는 않는다.
 */
function looksLikeInsufficientBalance(message: string): boolean {
  return /(잔액|이머니|충전|부족|한도)/.test(message);
}

async function callDomeApi(params: Record<string, string>): Promise<{ data: unknown; error: string | null }> {
  try {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { data: null, error: `HTTP_${res.status}` };
    const data = (await res.json()) as unknown;
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "NETWORK_FAIL" };
  }
}

export type DomeSession = { sId: string; cId: string; id: string };

/**
 * 로그인한다.
 *
 * ★ 왜 아이디를 응답으로도 돌려주나
 *
 * setOrder·getMyAsset은 로그인할 때 쓴 아이디(id)를 매번 다시 요구한다.
 * 세션(sId)만 들고 있으면 안 되고 짝을 이룬 아이디도 같이 넘겨야 한다.
 */
export async function loginDomeggook(): Promise<
  { ok: true; session: DomeSession } | { ok: false; reason: string }
> {
  const creds = getAccountCreds();
  if (!creds) return { ok: false, reason: "계정 정보(DOMEGGOOK_ACCOUNT_ID/PW)가 없습니다" };

  const { data, error } = await callDomeApi({
    ver: "4.1",
    mode: "setLogin",
    aid: creds.aid,
    id: creds.id,
    pw: creds.pw,
    om: "json",
    oe: "utf-8",
    loginKeep: "off",
    device: "thirdparty",
    ip: "0.0.0.0",
  });
  if (error) return { ok: false, reason: error };

  const apiErr = readError(data);
  if (apiErr) return { ok: false, reason: `${apiErr.message} (${apiErr.code})` };

  const body = (data as { domeggook?: { sId?: string; cId?: string } })?.domeggook;
  if (!body?.sId) return { ok: false, reason: "로그인 응답에 세션이 없습니다" };

  return { ok: true, session: { sId: body.sId, cId: body.cId ?? "", id: creds.id } };
}

export type EmoneyBalance = { totalKrw: number; cashKrw: number };

/** 이머니 잔액을 읽는다 — 발주 전에 미리 확인해 헛수고를 줄인다 */
export async function getEmoneyBalance(
  session: DomeSession,
): Promise<{ ok: true; balance: EmoneyBalance } | { ok: false; reason: string }> {
  const creds = getAccountCreds();
  if (!creds) return { ok: false, reason: "계정 정보가 없습니다" };

  const { data, error } = await callDomeApi({
    ver: "1.0",
    mode: "getMyAsset",
    aid: creds.aid,
    id: session.id,
    sId: session.sId,
    om: "json",
  });
  if (error) return { ok: false, reason: error };

  const apiErr = readError(data);
  if (apiErr) return { ok: false, reason: `${apiErr.message} (${apiErr.code})` };

  const asset = (data as {
    domeggook?: { data?: { currEmoney?: { total?: number; cash?: number } } };
  })?.domeggook?.data?.currEmoney;
  if (!asset) return { ok: false, reason: "잔액 응답을 읽지 못했습니다" };

  return { ok: true, balance: { totalKrw: asset.total ?? 0, cashKrw: asset.cash ?? 0 } };
}

export type WholesaleOrderInput = {
  session: DomeSession;
  /** 도매꾹 또는 도매매 상품번호 */
  itemNo: number;
  market: "dome" | "supply";
  quantity: number;
  /** 옵션이 없는 단일옵션 상품은 "00" — 지금 파이프라인은 단일옵션만 다룬다 */
  optionCode?: string;
  receiver: { name: string; phone: string; address: string; zipCode: string };
  /** 판매자에게 남길 말 — 위탁임을 숨기려면 비워둔다 */
  sellerNote?: string;
};

export type PlaceOrderResult =
  | { ok: true; orderNo: number }
  | { ok: false; reason: string; insufficientBalance: boolean };

/**
 * 주문서 생성 — 성공하는 순간 이머니가 빠진다.
 *
 * ★ 배송비 부담주체를 "선결제(P)"로 고정한 이유
 *
 * 착불(B)로 보내면 고객에게 배송비를 따로 받아야 하는데 위탁 흐름에 그런
 * 경로가 없다. 판매가에는 이미 배송비를 포함해 책정했으므로(원가 계산 시
 * 배송비를 포함했다) 선결제가 맞는 값이다.
 *
 * ★ 상호명을 자비스가 아니라 상점 이름으로 넣는 이유
 *
 * 이 값은 고객에게 가는 박스·송장에 노출된다. "도매꾹/도매매" 상표가
 * 그대로 보이면 고객이 위탁판매임을 알게 되고, 이건 도매꾹 자체가
 * 막으려는 것과 같은 문제라 반드시 상점 이름으로 가려야 한다.
 */
export async function placeWholesaleOrder(input: WholesaleOrderInput): Promise<PlaceOrderResult> {
  const creds = getAccountCreds();
  if (!creds) return { ok: false, reason: "계정 정보가 없습니다", insufficientBalance: false };

  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return { ok: false, reason: "수량이 올바르지 않습니다", insufficientBalance: false };
  }
  if (!input.receiver.zipCode || !input.receiver.address) {
    return { ok: false, reason: "배송지 정보가 불완전합니다", insufficientBalance: false };
  }

  // item[]은 채널||배송비부담||옵션코드|수량||판매자전달사항||배송요청사항,
  // deliinfo는 성명|이메일|우편번호|주소1|주소2|휴대전화|추가연락처|상호명|통관고유부호.
  // 조립 로직은 __buildOrderFieldsForTest와 공유한다 — 두 곳에서 각자 짜면
  // 하나만 고치고 잊어버리는 사고가 난다.
  const { itemValue, deliinfo } = __buildOrderFieldsForTest({
    market: input.market,
    optionCode: input.optionCode,
    quantity: input.quantity,
    sellerNote: input.sellerNote,
    receiver: input.receiver,
  });

  const { data, error } = await callDomeApi({
    ver: "4.3",
    mode: "setOrder",
    aid: creds.aid,
    id: input.session.id,
    sId: input.session.sId,
    ie: "utf-8",
    oe: "utf-8",
    om: "json",
    alliance: "Effiroad",
    receipt: "0",
    // 알림을 끈다 — 매 주문마다 도매꾹이 사장님께 별도 문자를 보내면
    // 자비스 알림과 겹쳐 혼란스럽고, 정작 급한 자비스 문자를 놓치게 된다.
    notify: "false",
    [`item[${input.itemNo}]`]: itemValue,
    deliinfo,
  });
  if (error) return { ok: false, reason: error, insufficientBalance: false };

  const apiErr = readError(data);
  if (apiErr) {
    return {
      ok: false,
      reason: `${apiErr.message} (${apiErr.code})`,
      insufficientBalance: looksLikeInsufficientBalance(apiErr.message),
    };
  }

  const body = data as { domeggook?: { result?: string; order?: { orderNo?: number } | Array<{ orderNo?: number }> } };
  const order = body.domeggook?.order;
  const orderNo = Array.isArray(order) ? order[0]?.orderNo : order?.orderNo;
  if (body.domeggook?.result !== "SUCCESS" || !orderNo) {
    return { ok: false, reason: "주문 응답에 성공 표시나 주문번호가 없습니다", insufficientBalance: false };
  }

  return { ok: true, orderNo };
}

/**
 * 배송지 문자열을 주소1/주소2로 가른다.
 *
 * 도매꾹 deliinfo는 주소1·주소2를 **둘 다 필수**로 받는다. 토스 주문의
 * customer.address는 이미 합쳐진 한 줄이라, 동/호수처럼 보이는 꼬리를
 * 최대한 떼어 주소2로 보낸다. 못 떼면 "-"를 넣는다 — 주소1에 전체 정보가
 * 이미 있으므로 배송 자체는 지장이 없고, 필수 칸을 비워 거절당하는 것만
 * 막으면 된다.
 */
/**
 * 테스트 전용 — item[]·deliinfo 문자열 조립과 잔액부족 판별만 따로 검증한다.
 *
 * 이 세 가지는 네트워크 호출 없이도 틀릴 수 있는 부분이고, 틀리면 실제 돈이
 * 걸린 주문이 엉뚱하게 나간다. 그래서 반드시 테스트로 묶어둔다.
 */
export function __buildOrderFieldsForTest(input: {
  market: "dome" | "supply";
  optionCode?: string;
  quantity: number;
  sellerNote?: string;
  receiver: { name: string; phone: string; address: string; zipCode: string };
}): { itemValue: string; deliinfo: string } {
  const optionCode = input.optionCode ?? "00";
  const itemValue = [input.market, "P", `${optionCode}|${input.quantity}`, input.sellerNote ?? "", ""].join(
    "||",
  );
  const { address1, address2 } = splitAddressForDelivery(input.receiver.address);
  const deliinfo = [
    input.receiver.name,
    "",
    input.receiver.zipCode,
    address1,
    address2,
    input.receiver.phone,
    "",
    "에피로드",
    "",
  ].join("|");
  return { itemValue, deliinfo };
}

export function __looksLikeInsufficientBalanceForTest(message: string): boolean {
  return looksLikeInsufficientBalance(message);
}

function splitAddressForDelivery(fullAddress: string): { address1: string; address2: string } {
  const text = fullAddress.trim();
  const m = text.match(/\s((?:[\d-]+동\s*)?(?:지하\s*)?[\dB]+층.*|[\d-]+동\s.*|[\d-]+호\b.*)$/);
  if (m && m.index) {
    return { address1: text.slice(0, m.index).trim(), address2: m[1].trim() };
  }
  return { address1: text, address2: "-" };
}

/**
 * 발주 준비 상태를 미리 확인한다 — 주문 없이도, 아무것도 사지 않고.
 *
 * ★ 왜 필요한가
 *
 * 이 확인이 없으면 **첫 고객 주문이 곧 첫 테스트**가 된다. 로그인 설정이
 * 틀려 있으면 그 사실을 고객이 기다리는 동안 알게 되고, 발송기한은 그 사이
 * 계속 흘러간다. 돈이 걸린 경로는 실전 전에 검증할 수 있어야 한다.
 *
 * 로그인과 잔액 조회만 한다 — 둘 다 읽기 전용이라 호출해도 아무것도 사지
 * 않고 아무 값도 바뀌지 않는다.
 */
export type OrderingHealth = {
  configured: boolean;
  loginOk: boolean;
  balanceKrw: number | null;
  reason?: string;
};

export async function checkOrderingHealth(): Promise<OrderingHealth> {
  if (!isDomeggookOrderingConfigured()) {
    return { configured: false, loginOk: false, balanceKrw: null, reason: "계정 정보 미설정" };
  }

  const login = await loginDomeggook();
  if (!login.ok) {
    return { configured: true, loginOk: false, balanceKrw: null, reason: login.reason };
  }

  const balance = await getEmoneyBalance(login.session);
  if (!balance.ok) {
    // 로그인은 됐으니 절반은 확인된 것이다. 잔액만 못 읽은 것과 로그인
    // 자체가 안 되는 것은 원인이 전혀 다르므로 구분해서 돌려준다.
    return { configured: true, loginOk: true, balanceKrw: null, reason: balance.reason };
  }

  return { configured: true, loginOk: true, balanceKrw: balance.balance.cashKrw };
}
