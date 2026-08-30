/**
 * 스레드(Threads) 게시 — Graph API 2단계 발행
 *
 * 컨테이너 생성(POST /{userId}/threads) → 발행(POST /{userId}/threads_publish)
 * 순서다. 레이트리밋은 24시간 250개라 하루 몇 건 올리는 이 용도로는
 * 문제가 안 된다.
 *
 * ★ 비즈니스 계정 + Meta 앱 심사가 먼저다
 *
 * 심사 전에는 `resolveThreadsConfig`가 null을 내고, `postToThreads`가 이걸
 * 그대로 실패로 기록한다 — 여기서 가짜로 "성공"을 만들어내지 않는다.
 */

import { resolveThreadsConfig } from "../config";
import type { SharelinkCaption, SharelinkSettings } from "../types";

const GRAPH_BASE = "https://graph.threads.net/v1.0";

export type ThreadsPostResult = { ok: true; postedId: string } | { ok: false; error: string };

export async function postToThreads(
  settings: SharelinkSettings,
  caption: SharelinkCaption,
  imageUrl?: string,
): Promise<ThreadsPostResult> {
  const config = resolveThreadsConfig(settings);
  if (!config) return { ok: false, error: "스레드 계정이 연결되어 있지 않습니다 (앱 심사 대기 중일 수 있음)" };

  try {
    // 1단계 — 컨테이너 생성
    const createUrl = new URL(`${GRAPH_BASE}/${config.userId}/threads`);
    createUrl.searchParams.set("media_type", imageUrl ? "IMAGE" : "TEXT");
    createUrl.searchParams.set("text", caption.text);
    if (imageUrl) createUrl.searchParams.set("image_url", imageUrl);
    createUrl.searchParams.set("access_token", config.accessKey);

    const createRes = await fetch(createUrl, { method: "POST", signal: AbortSignal.timeout(15_000) });
    const createData = (await createRes.json()) as { id?: string; error?: { message?: string } };
    if (!createRes.ok || !createData.id) {
      return { ok: false, error: createData.error?.message ?? `컨테이너 생성 실패 (HTTP ${createRes.status})` };
    }

    // 2단계 — 발행. 컨테이너가 처리되기까지 약간의 지연이 있을 수 있다는
    // Meta 문서 안내에 따라 한 번 재시도한다.
    const publishOnce = async () => {
      const publishUrl = new URL(`${GRAPH_BASE}/${config.userId}/threads_publish`);
      publishUrl.searchParams.set("creation_id", createData.id!);
      publishUrl.searchParams.set("access_token", config.accessKey);
      const res = await fetch(publishUrl, { method: "POST", signal: AbortSignal.timeout(15_000) });
      const data = (await res.json()) as { id?: string; error?: { message?: string } };
      return { res, data };
    };

    let { res, data } = await publishOnce();
    if (!res.ok) {
      await new Promise((r) => setTimeout(r, 3_000));
      ({ res, data } = await publishOnce());
    }

    if (!res.ok || !data.id) {
      return { ok: false, error: data.error?.message ?? `발행 실패 (HTTP ${res.status})` };
    }
    return { ok: true, postedId: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "스레드 발행 중 오류" };
  }
}
