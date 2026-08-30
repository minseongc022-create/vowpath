/**
 * 인스타그램 게시 — Graph API 2단계 발행
 *
 * 컨테이너 생성(POST /{ig-user-id}/media) → 발행(POST /{ig-user-id}/media_publish).
 * 스레드와 같은 모양이라 실수하기 쉬운 지점도 같다 — 컨테이너 ID를
 * 헷갈리면 안 되고, 이미지 URL이 없으면 발행이 안 된다(인스타는 텍스트만
 * 게시가 불가능하다).
 *
 * ★ 요구사항이 스레드보다 하나 더 있다
 *
 * 비즈니스/크리에이터 계정 + **Facebook 페이지 연결** + Meta 앱 심사
 * (`instagram_content_publish` 권한). 이 중 하나라도 안 갖춰지면 토큰
 * 발급 자체가 안 되므로, 이 파일 입장에서는 `resolveInstagramConfig`가
 * null인지만 보면 된다 — 그 안쪽 사정을 여기서 재확인하지 않는다.
 */

import { resolveInstagramConfig } from "../config";
import type { SharelinkCaption, SharelinkSettings } from "../types";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export type InstagramPostResult = { ok: true; postedId: string } | { ok: false; error: string };

export async function postToInstagram(
  settings: SharelinkSettings,
  caption: SharelinkCaption,
  imageUrl: string,
): Promise<InstagramPostResult> {
  const config = resolveInstagramConfig(settings);
  if (!config) return { ok: false, error: "인스타그램 계정이 연결되어 있지 않습니다 (앱 심사 대기 중일 수 있음)" };
  if (!imageUrl) return { ok: false, error: "이미지 URL이 없어 인스타그램에는 게시할 수 없습니다" };

  try {
    // 1단계 — 미디어 컨테이너 생성
    const createUrl = new URL(`${GRAPH_BASE}/${config.userId}/media`);
    createUrl.searchParams.set("image_url", imageUrl);
    createUrl.searchParams.set("caption", caption.text);
    createUrl.searchParams.set("access_token", config.accessKey);

    const createRes = await fetch(createUrl, { method: "POST", signal: AbortSignal.timeout(15_000) });
    const createData = (await createRes.json()) as { id?: string; error?: { message?: string } };
    if (!createRes.ok || !createData.id) {
      return { ok: false, error: createData.error?.message ?? `컨테이너 생성 실패 (HTTP ${createRes.status})` };
    }

    // 2단계 — 발행
    const publishUrl = new URL(`${GRAPH_BASE}/${config.userId}/media_publish`);
    publishUrl.searchParams.set("creation_id", createData.id);
    publishUrl.searchParams.set("access_token", config.accessKey);

    const publishRes = await fetch(publishUrl, { method: "POST", signal: AbortSignal.timeout(15_000) });
    const publishData = (await publishRes.json()) as { id?: string; error?: { message?: string } };
    if (!publishRes.ok || !publishData.id) {
      return { ok: false, error: publishData.error?.message ?? `발행 실패 (HTTP ${publishRes.status})` };
    }
    return { ok: true, postedId: publishData.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "인스타그램 발행 중 오류" };
  }
}
