import "server-only";

import { prisma } from "./db";
import { normalizeUiMode, type UiMode } from "./ui-mode";

/**
 * VibeSafe를 보는 사람의 화면 취향.
 *
 * ★ 값은 오직 사용자가 고른 것만 들어온다
 *
 * 저장소를 읽고, 커밋 메시지를 보고, 쓰는 프레임워크를 보고 "이 사람은
 * 초보/전문가"라고 정하는 코드는 여기에도 다른 어디에도 없다. 그런 추론은
 * 자주 틀리고, 틀렸을 때 무례하고, 사용자가 왜 그런 화면을 보는지 알 길이
 * 없다. 물어보고, 답을 저장하고, 언제든 바꿀 수 있게 한다.
 */
export async function getUiMode(userId: string): Promise<UiMode> {
  const user = await prisma.vibesafeUser.findUnique({
    where: { id: userId },
    select: { uiMode: true },
  });
  return normalizeUiMode(user?.uiMode);
}

export type UiModePreference = { mode: UiMode; asked: boolean };

/** asked=false면 아직 한 번도 물어본 적이 없다 = 온보딩 질문을 띄울 때다. */
export async function getUiModePreference(userId: string): Promise<UiModePreference> {
  const user = await prisma.vibesafeUser.findUnique({
    where: { id: userId },
    select: { uiMode: true, uiModeSetAt: true },
  });
  return { mode: normalizeUiMode(user?.uiMode), asked: user?.uiModeSetAt != null };
}

export async function setUiMode(userId: string, mode: UiMode): Promise<UiMode> {
  const updated = await prisma.vibesafeUser.update({
    where: { id: userId },
    data: { uiMode: mode, uiModeSetAt: new Date() },
    select: { uiMode: true },
  });
  return normalizeUiMode(updated.uiMode);
}
