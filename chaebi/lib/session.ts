import { cookies } from "next/headers";
import { CHAEBI_UID_COOKIE, isValidOwnerId } from "./owner";

/** 서버 컴포넌트 전용. 미들웨어에서 쓰려면 owner.ts를 직접 import 할 것. */
export async function currentOwnerId(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(CHAEBI_UID_COOKIE)?.value;
  return isValidOwnerId(value) ? value : null;
}

export {
  CHAEBI_UID_COOKIE,
  CHAEBI_UID_MAX_AGE,
  isValidOwnerId,
  newOwnerId,
  ownerCookieOptions,
  ownerIdFromRequest,
} from "./owner";
