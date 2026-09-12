/**
 * 사용자가 등록하는 "내 서비스 주소" 검증.
 *
 * ★ 왜 이게 보안 문제인가
 *
 * 등록된 주소는 **우리 워커의 브라우저가 실제로 방문한다**. 아무 주소나
 * 받으면 남이 우리 인프라를 통해 내부망을 긁게 만들 수 있다(SSRF). 특히
 * `169.254.169.254`는 클라우드 인스턴스의 자격증명을 뱉는 주소다.
 *
 * ★ 여기서 막는 것과 못 막는 것
 *
 * 막는다: localhost류 이름, 사설/링크로컬 IP 리터럴, http(개발 예외 제외),
 *         자격증명이 박힌 URL.
 * 못 막는다: 공개 DNS 이름이 사설 IP로 해석되는 경우(DNS rebinding). 이건
 *         워커 쪽에서 네트워크를 격리하는 걸로 막아야 한다 — 문서에 적어뒀다.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]", "metadata.google.internal",
]);

const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost", ".home.arpa"];

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if ([a, Number(m[2]), Number(m[3]), Number(m[4])].some((n) => n > 255)) return true;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true; // 클라우드 메타데이터
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

export type UrlCheck = { ok: true; url: string } | { ok: false; error: string };

/**
 * 로컬 주소를 허용하는 개발 전용 스위치.
 *
 * 자기 노트북에서 VibeSafe를 돌리며 자기 앱(localhost:3000)을 검사하는 것은
 * 정당한 쓰임이다. 하지만 운영 배포에서 켜지면 SSRF 방어가 사라지므로
 * **기본은 꺼짐**이고, 배포 환경에서는 켜져 있어도 무시한다.
 *
 * ★ 켜져 있어도 클라우드 메타데이터(169.254.0.0/16)는 끝까지 막는다
 *
 * 처음엔 이 스위치가 켜지면 호스트 검사를 통째로 건너뛰게 만들었다. 그러자
 * `http://169.254.169.254/latest/meta-data`가 그대로 등록됐다 — AWS·GCP에서
 * 인스턴스 자격증명을 뱉는 바로 그 주소다. 로컬 개발이라는 정당한 용도에
 * 링크로컬 주소가 필요한 경우는 없으므로, 이 스위치가 푸는 것은 loopback과
 * 사설 대역뿐이다.
 */
function allowLocalTargets(): boolean {
  if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") return false;
  return process.env.VIBESAFE_ALLOW_LOCAL_TARGETS === "1";
}

/** 어떤 설정에서도 열어주지 않는 주소. */
function isAlwaysBlockedHost(host: string): boolean {
  if (host === "metadata.google.internal") return true;
  // 링크로컬 IPv4 — 클라우드 메타데이터 서비스가 여기 산다.
  if (/^169\.254\./.test(host)) return true;
  // IPv6 링크로컬/유니크로컬 리터럴.
  if (/^\[?(fe80|fc|fd)/i.test(host)) return true;
  return false;
}

export function validateServiceUrl(input: string, options?: { allowHttp?: boolean }): UrlCheck {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "서비스 주소를 입력해주세요." };
  if (raw.length > 2000) return { ok: false, error: "주소가 너무 깁니다." };

  let parsed: URL;
  try {
    parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return { ok: false, error: "주소 형식을 확인해주세요. (예: https://my-app.vercel.app)" };
  }

  const allowHttp = options?.allowHttp ?? process.env.NODE_ENV !== "production";
  if (parsed.protocol !== "https:" && !(allowHttp && parsed.protocol === "http:")) {
    return { ok: false, error: "https 주소만 등록할 수 있습니다." };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "주소에 아이디·비밀번호를 담지 말아주세요." };
  }

  const host = parsed.hostname.toLowerCase();
  if (isAlwaysBlockedHost(host)) {
    return { ok: false, error: "내부 네트워크 주소는 등록할 수 없습니다." };
  }
  if (allowLocalTargets()) {
    return { ok: true, url: `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "")}` };
  }
  if (BLOCKED_HOSTNAMES.has(host) || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) {
    return { ok: false, error: "인터넷에 공개된 주소만 등록할 수 있습니다." };
  }
  if (isPrivateIpv4(host) || host.startsWith("[")) {
    return { ok: false, error: "내부 네트워크 주소는 등록할 수 없습니다." };
  }
  if (!host.includes(".")) {
    return { ok: false, error: "주소 형식을 확인해주세요. (예: https://my-app.vercel.app)" };
  }

  // 끝의 `/`는 떼고 저장한다 — 저장 형태가 흔들리면 URL 비교가 어긋난다.
  const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "")}`;
  return { ok: true, url: normalized };
}

/** 배포처를 보고 플랫폼을 추측한다. MVP는 Vercel만 실제 검증 대상이다. */
export function guessPlatform(url: string): string {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (host.endsWith(".vercel.app")) return "vercel";
  if (host.endsWith(".onrender.com")) return "render";
  if (host.endsWith(".up.railway.app")) return "railway";
  if (host.endsWith(".web.app") || host.endsWith(".firebaseapp.com")) return "firebase";
  if (host.endsWith(".netlify.app")) return "netlify";
  return "custom";
}
