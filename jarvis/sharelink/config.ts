/**
 * 쉐어링크 · 채널 연결 설정 — 키가 어디에 있든 한 곳에서 판단한다
 *
 * `core/toss-config.ts`와 똑같은 이유로 똑같은 모양을 쓴다: 키는 Vercel
 * 환경변수와 설정 화면(자비스 저장소) 두 군데에 있을 수 있고, 화면에서
 * 넣은 값이 있으면 그걸 우선한다 — 사장님이 방금 넣은 값이 더 최신이다.
 *
 * ★ 지금은 전부 "미연결"이 정상이다
 *
 * 쉐어링크 Open API는 "상품을 소개·공유하는 서비스"로 승인받아야 키가
 * 나온다(2026-08 기준 신청 전). Threads·Instagram도 Meta 앱 심사가 먼저다.
 * 그래서 이 파일의 역할은 "키가 없을 때 조용히, 명확하게 안 도는 것"이지
 * "키를 만들어내는 것"이 아니다. 심사가 끝나 키가 생기면 설정 화면이나
 * 환경변수에 넣기만 하면 알아서 연결된다 — 코드를 다시 고칠 필요가 없다.
 */

import type { SharelinkSettings } from "./types";

export type SharelinkApiConfig = {
  apiKey: string;
  fromEnv: boolean;
};

export function sharelinkConfigFromEnv(): SharelinkApiConfig | null {
  const apiKey = process.env.SHARELINK_API_KEY?.trim();
  if (!apiKey) return null;
  return { apiKey, fromEnv: true };
}

export function resolveSharelinkConfig(settings: SharelinkSettings): SharelinkApiConfig | null {
  const apiKey = settings.sharelinkApiKey?.trim();
  if (apiKey) return { apiKey, fromEnv: false };
  return sharelinkConfigFromEnv();
}

export type ThreadsConfig = {
  accessKey: string;
  userId: string;
  fromEnv: boolean;
};

export function resolveThreadsConfig(settings: SharelinkSettings): ThreadsConfig | null {
  const accessKey = settings.threadsAccessKey?.trim() || process.env.THREADS_ACCESS_KEY?.trim();
  const userId = settings.threadsUserId?.trim() || process.env.THREADS_USER_ID?.trim();
  if (!accessKey || !userId) return null;
  return { accessKey, userId, fromEnv: !settings.threadsAccessKey?.trim() };
}

export type InstagramConfig = {
  accessKey: string;
  userId: string;
  fromEnv: boolean;
};

export function resolveInstagramConfig(settings: SharelinkSettings): InstagramConfig | null {
  const accessKey = settings.instagramAccessKey?.trim() || process.env.INSTAGRAM_ACCESS_KEY?.trim();
  const userId = settings.instagramUserId?.trim() || process.env.INSTAGRAM_USER_ID?.trim();
  if (!accessKey || !userId) return null;
  return { accessKey, userId, fromEnv: !settings.instagramAccessKey?.trim() };
}

export function maskKey(value?: string): string | null {
  if (!value) return null;
  return value.length <= 8 ? "••••••••" : `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
