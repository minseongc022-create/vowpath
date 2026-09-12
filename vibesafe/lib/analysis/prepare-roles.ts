/**
 * AI 응답 → 앱 사용자 역할(USER 단계)로 바꾸는 순수 변환.
 *
 * ★ USER 단계가 왜 필요한가
 *
 * 흐름 목록만 있으면 "checkout_flow가 실패했습니다"까지밖에 못 간다. 역할이
 * 있으면 **"손님이 결제를 못 합니다"**라고 말할 수 있다. 같은 사실이지만
 * 후자는 사장님이 읽고 바로 이해하고, 전자는 못 한다.
 *
 * 수정 단계에서도 쓴다. "이 수정이 손님 흐름 3개 중 3개를 건드린다"는
 * 위험도 판단의 재료이고, 사용자에게 보여줄 말이기도 하다.
 *
 * ★ 다시 말하지만, 이 역할은 분석 대상 앱을 쓰는 사람이다
 *
 * VibeSafe 화면을 보는 사람(VibesafeUser.uiMode)과 아무 관계가 없다. 손님용
 * 앱을 만들었다고 그 개발자가 초보인 것이 아니다. 두 값 사이에 코드 경로를
 * 만들지 않는다 — 만들고 싶어지는 순간을 대비해 여기 적어둔다.
 */
import type { AnalysisResponse } from "./prompt";

const MAX_ROLES = 4;

export type PreparedRole = {
  key: string;
  title: string;
  description: string;
  isPrimary: boolean;
  sortOrder: number;
};

function normalizeKey(raw: string, index: number): string {
  const key = (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return key || `role_${index + 1}`;
}

/**
 * 역할이 하나도 안 왔을 때 쓰는 값.
 *
 * 비워두지 않는 이유: 화면과 알림 문구가 전부 "누가"로 시작하는데, 역할이
 * 없으면 문장이 만들어지지 않는다. "사용자"는 틀린 말이 아니고, 사용자가
 * 나중에 직접 고칠 수 있다.
 */
export const DEFAULT_ROLE: PreparedRole = {
  key: "user",
  title: "사용자",
  description: "이 앱을 사용하는 사람",
  isPrimary: true,
  sortOrder: 0,
};

export function prepareUserRoles(response: AnalysisResponse): PreparedRole[] {
  const raw = (response.userRoles ?? []).slice(0, MAX_ROLES);
  const used = new Set<string>();
  const roles: PreparedRole[] = [];

  for (const [index, role] of raw.entries()) {
    const title = (role?.title ?? "").trim().slice(0, 40);
    if (!title) continue;

    let key = normalizeKey(role?.key ?? title, index);
    while (used.has(key)) key = `${key}_${used.size + 1}`;
    used.add(key);

    roles.push({
      key,
      title,
      description: (role?.description ?? "").trim().slice(0, 200),
      isPrimary: Boolean(role?.isPrimary),
      sortOrder: index,
    });
  }

  if (roles.length === 0) return [{ ...DEFAULT_ROLE }];

  // 주 사용자는 정확히 한 명. 아무도 없으면 첫 번째, 여럿이면 첫 번째만 남긴다.
  // 둘 다 주 사용자라고 하면 "누구 앱인가"에 답을 못 하게 된다.
  let primarySeen = false;
  for (const role of roles) {
    if (role.isPrimary && !primarySeen) {
      primarySeen = true;
      continue;
    }
    role.isPrimary = false;
  }
  if (!primarySeen) roles[0].isPrimary = true;

  return roles;
}

/**
 * 흐름 → 역할 연결(MAP 단계).
 *
 * AI가 지목한 역할 키가 실제 역할 목록에 없으면 **버린다**. 없는 역할에
 * 흐름을 붙이면 화면에서 "?? 님이 못 하는 일"이 되어 버린다. 대신 주 사용자
 * 역할로 몰아주지도 않고 null로 둔다 — 모르는 것을 아는 척하지 않는다.
 *
 * key로 지목했으면 그대로, 한국어 이름("손님")으로 지목했으면 이름으로 찾는다.
 * 둘 다 실제로 온다.
 */
export function resolveRoleKey(raw: string | null | undefined, roles: PreparedRole[]): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  const normalized = value.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (roles.some((role) => role.key === normalized)) return normalized;

  const byTitle = roles.find((role) => role.title.trim() === value);
  return byTitle ? byTitle.key : null;
}
