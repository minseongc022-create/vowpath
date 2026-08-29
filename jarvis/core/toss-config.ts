/**
 * 토스쇼핑 연결 — 키가 어디에 있든 한 곳에서 판단한다
 *
 * ★ 실제로 있던 버그: 키가 있는데 "미연결"로 떴다
 *
 * 토스 키는 두 군데에 있을 수 있다 — Vercel 환경변수(서버)와 설정 화면에서
 * 넣은 값(자비스 저장소). 도매꾹은 두 곳을 모두 보는데, 토스는 **저장소만**
 * 보고 있었다. 그래서 서버에 키가 멀쩡히 들어 있어도 설정 화면에는 계속
 * "미연결"로 떴다.
 *
 * 같은 판단을 두 군데서 다르게 하면 반드시 어긋난다 — 여기 한 곳에서만
 * 정한다.
 */

export type TossConfig = {
  accessKey: string;
  secretKey: string;
  sandbox: boolean;
  /** 서버 환경변수에서 왔는가 — 화면에 "서버에 설정됨"으로 알려주기 위해 */
  fromEnv: boolean;
};

type SavedTossSettings = {
  tossAccessKey?: string;
  tossSecretKey?: string;
  tossSandbox?: boolean;
};

/** Vercel 환경변수에 들어 있는 키 */
export function tossConfigFromEnv(): TossConfig | null {
  const accessKey = process.env.TOSS_SHOPPING_ACCESS_KEY?.trim();
  const secretKey = process.env.TOSS_SHOPPING_SECRET_KEY?.trim();
  if (!accessKey || !secretKey) return null;
  return {
    accessKey,
    secretKey,
    sandbox: process.env.TOSS_SHOPPING_SANDBOX === "1",
    fromEnv: true,
  };
}

/**
 * 실제로 쓸 토스 설정.
 *
 * 화면에서 직접 넣은 키가 있으면 그걸 우선한다 — 사장님이 방금 넣은 값이
 * 환경변수보다 최신이라고 보는 게 맞다.
 */
export function resolveTossConfig(settings: SavedTossSettings): TossConfig | null {
  const accessKey = settings.tossAccessKey?.trim();
  const secretKey = settings.tossSecretKey?.trim();
  if (accessKey && secretKey) {
    return {
      accessKey,
      secretKey,
      sandbox: settings.tossSandbox ?? false,
      fromEnv: false,
    };
  }
  return tossConfigFromEnv();
}

export function isTossConfigured(settings: SavedTossSettings): boolean {
  return resolveTossConfig(settings) !== null;
}

export function maskTossKey(value?: string): string | null {
  if (!value) return null;
  return value.length <= 8 ? "••••••••" : `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
