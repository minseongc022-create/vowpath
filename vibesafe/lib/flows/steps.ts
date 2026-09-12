/**
 * 흐름 단계의 문법.
 *
 * ★ 왜 CSS 셀렉터를 그대로 쓰지 않는가
 *
 * AI에게 "셀렉터를 써라"고 하면 `.css-1x2y3z > div:nth-child(3)` 같은 걸 낸다.
 * Tailwind·CSS-in-JS 앱에서 이런 건 다음 배포에 그냥 깨진다 — 그러면 우리가
 * "앱이 망가졌다"고 잘못된 알림을 보내게 되고, 그 순간 이 제품은 신뢰를 잃는다.
 * (오탐 한 번이 미탐 한 번보다 훨씬 비싸다.)
 *
 * 그래서 사람이 화면을 알아보는 방식 — 보이는 글자, 역할, 라벨 — 을 우선하는
 * 작은 문법을 정해두고 AI에게 그 안에서만 쓰게 한다. 워커는 이 문법을
 * Playwright의 getByRole/getByText 같은 것으로 옮긴다.
 */

export const FLOW_ACTIONS = [
  "goto",
  "click",
  "fill",
  "press",
  "expect_text",
  "expect_visible",
  "expect_url",
  "wait",
] as const;

export type FlowAction = (typeof FLOW_ACTIONS)[number];

export const SELECTOR_KINDS = ["role", "text", "label", "placeholder", "testid", "css"] as const;
export type SelectorKind = (typeof SELECTOR_KINDS)[number];

export type ParsedSelector =
  | { kind: "role"; role: string; name: string | null }
  | { kind: "text" | "label" | "placeholder" | "testid" | "css"; value: string };

/** `role:button|로그인` / `text:예약하기` / `css:#submit` */
export function parseSelector(raw: string): ParsedSelector | null {
  const idx = raw.indexOf(":");
  if (idx <= 0) return null;
  const kind = raw.slice(0, idx).trim().toLowerCase();
  const rest = raw.slice(idx + 1).trim();
  if (!rest) return null;

  if (kind === "role") {
    const [role, name] = rest.split("|");
    if (!role?.trim()) return null;
    return { kind: "role", role: role.trim().toLowerCase(), name: name?.trim() || null };
  }
  if ((SELECTOR_KINDS as readonly string[]).includes(kind)) {
    return { kind: kind as Exclude<SelectorKind, "role">, value: rest };
  }
  return null;
}

export function isValidSelector(raw: string | null | undefined): boolean {
  return Boolean(raw && parseSelector(raw));
}

export type FlowStepInput = {
  action: string;
  selector?: string | null;
  value?: string | null;
  secretRef?: string | null;
  description: string;
  optional?: boolean;
};

export type NormalizedStep = {
  action: FlowAction;
  selector: string | null;
  value: string | null;
  secretRef: "username" | "password" | null;
  description: string;
  optional: boolean;
};

const NEEDS_SELECTOR: FlowAction[] = ["click", "fill", "press", "expect_visible"];
const NEEDS_VALUE: FlowAction[] = ["goto", "fill", "press", "expect_text", "expect_url", "wait"];

/**
 * AI가 낸 단계를 우리가 실행할 수 있는 모양으로 정리한다.
 * 말이 안 되는 단계는 **고치지 않고 버린다** — 억지로 채우면 잘못된 검사를 돌린다.
 */
export function normalizeStep(input: FlowStepInput): NormalizedStep | null {
  const action = input.action?.trim().toLowerCase() as FlowAction;
  if (!FLOW_ACTIONS.includes(action)) return null;

  const description = input.description?.trim();
  if (!description) return null;

  const selector = input.selector?.trim() || null;
  if (NEEDS_SELECTOR.includes(action)) {
    if (!selector || !isValidSelector(selector)) return null;
  }

  const secretRef =
    input.secretRef === "username" || input.secretRef === "password" ? input.secretRef : null;

  let value = input.value?.trim() || null;
  if (action === "wait") {
    const ms = Number(value ?? "1000");
    // 무한정 기다리게 두지 않는다 — 워커 시간이 곧 비용이다.
    value = String(Math.min(Math.max(Number.isFinite(ms) ? ms : 1000, 100), 10_000));
  }
  if (NEEDS_VALUE.includes(action) && !value && !secretRef) return null;

  return {
    action,
    selector: NEEDS_SELECTOR.includes(action) ? selector : selector,
    value,
    secretRef,
    description: description.slice(0, 200),
    optional: Boolean(input.optional),
  };
}

export const ACTION_LABELS: Record<FlowAction, string> = {
  goto: "페이지 열기",
  click: "누르기",
  fill: "입력하기",
  press: "키 누르기",
  expect_text: "글자 확인",
  expect_visible: "화면 확인",
  expect_url: "주소 확인",
  wait: "잠시 기다리기",
};
