/**
 * 사장님 비밀번호 확인 — 옛 엔진을 거치지 않고
 *
 * ★ 왜 따로 만들었나
 *
 * 옛 로그인은 `toss-shop/lib/store.ts`(2,876줄)의 authenticateAccount를
 * 불렀다. 그 store.ts가 옛 셀러 엔진 전체를 import하는 바람에, **비밀번호
 * 한 번 확인하려고 옛 파일 106개가 통째로 딸려오는** 구조였다. 옛 것을
 * 지우려면 이 고리부터 끊어야 한다.
 *
 * ★ 지금 쓰던 비밀번호가 그대로 통해야 한다
 *
 * 비밀번호 해시는 옛 저장소(KV `toss-shop:store:v1`)의 계정 목록 안에
 * 있다. 여기서는 그 저장소를 **import하지 않고 KV 값만 직접 한 번 읽어**
 * 소유자 해시를 자비스 쪽(`jarvis:owner:v1`)으로 옮긴다. 코드 의존은
 * 안 생기고, 사장님은 쓰던 비밀번호를 그대로 쓴다.
 *
 * 옮기고 나면 옛 저장소는 더 이상 읽지 않는다 — 지워도 로그인이 멀쩡하다.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { kv } from "@vercel/kv";
import { useKvStore } from "@/lib/kv-config";
import { kvGetSafe } from "@/lib/kv-safe";
import { hashPassword, verifyPassword } from "@/lib/auth-password";
import { isOwnerEmail } from "./access";

const OWNER_KEY = "jarvis:owner:v1";
/** 옛 저장소 — 해시를 한 번 옮겨오기 위해서만 읽는다(코드 import는 없다) */
const LEGACY_STORE_KEY = "toss-shop:store:v1";

const DATA_DIR = join(process.cwd(), ".data");
const OWNER_FILE = join(DATA_DIR, "jarvis-owner.json");

type OwnerCredential = {
  email: string;
  passwordHash: string;
  /** 옛 저장소에서 옮겨온 시각 — 사람이 나중에 이력을 알아볼 수 있게 */
  migratedAt?: string;
  updatedAt: string;
};

type LegacyStoreShape = {
  accounts?: Array<{ email?: string; passwordHash?: string; name?: string; id?: string }>;
};

// ── 읽기·쓰기 ─────────────────────────────────────────────

async function loadOwner(): Promise<OwnerCredential | null> {
  if (useKvStore()) {
    return (await kvGetSafe<OwnerCredential>(OWNER_KEY)) ?? null;
  }
  try {
    return JSON.parse(await readFile(OWNER_FILE, "utf8")) as OwnerCredential;
  } catch {
    return null;
  }
}

async function saveOwner(cred: OwnerCredential): Promise<void> {
  if (useKvStore()) {
    await kv.set(OWNER_KEY, cred);
    return;
  }
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(OWNER_FILE, JSON.stringify(cred, null, 2));
  } catch {
    // 읽기 전용 파일시스템 — 저장을 못 해도 이번 로그인 자체는 살린다
  }
}

/**
 * 옛 저장소에서 소유자 해시를 한 번만 옮겨온다.
 *
 * 옛 저장소가 이미 지워졌거나 소유자 계정이 없으면 null이다 — 그때는
 * 지어내지 않고 그대로 실패시킨다. 여기서 "아무 비밀번호나 통과"시키면
 * 소유자 이메일만 아는 사람이 비밀번호를 새로 정할 수 있게 된다.
 */
async function migrateFromLegacy(email: string): Promise<OwnerCredential | null> {
  if (!useKvStore()) return null;

  const legacy = await kvGetSafe<LegacyStoreShape>(LEGACY_STORE_KEY);
  const account = legacy?.accounts?.find(
    (a) => a.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!account?.passwordHash) return null;

  const cred: OwnerCredential = {
    email: email.toLowerCase(),
    passwordHash: account.passwordHash,
    migratedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveOwner(cred);
  return cred;
}

// ── 바깥에서 쓰는 것 ───────────────────────────────────────

export type OwnerLoginResult =
  | { ok: true; email: string; name: string }
  | { ok: false; reason: "NOT_OWNER" | "NO_CREDENTIAL" | "BAD_PASSWORD" };

/**
 * 소유자 로그인.
 *
 * 실패 이유를 구분해 돌려주지만, **호출하는 쪽은 사용자에게 그대로 보여주면
 * 안 된다** — "계정이 없습니다"와 "비밀번호가 틀렸습니다"를 구분해주면
 * 어떤 이메일이 존재하는지 알려주는 셈이다. 이유는 로그·판단용이다.
 */
export async function verifyOwnerLogin(
  email: string,
  password: string,
): Promise<OwnerLoginResult> {
  if (!isOwnerEmail(email)) return { ok: false, reason: "NOT_OWNER" };

  let cred = await loadOwner();
  if (!cred || cred.email.toLowerCase() !== email.toLowerCase()) {
    cred = await migrateFromLegacy(email);
  }
  if (!cred) return { ok: false, reason: "NO_CREDENTIAL" };

  const ok = await verifyPassword(password, cred.passwordHash);
  if (!ok) return { ok: false, reason: "BAD_PASSWORD" };

  return { ok: true, email: cred.email, name: "사장님" };
}

/** 비밀번호 변경 — 소유자 이메일이 아니면 아무것도 하지 않는다 */
export async function setOwnerPassword(
  email: string,
  password: string,
): Promise<boolean> {
  if (!isOwnerEmail(email)) return false;
  await saveOwner({
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    updatedAt: new Date().toISOString(),
  });
  return true;
}
