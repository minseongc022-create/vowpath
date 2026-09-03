import "server-only";

import { isDatabaseConfigured } from "./db";
import * as dbStore from "./companion-store-db";
import * as fileStore from "./companion-store-file";

export type { SharedPlanRecord } from "./companion-store-file";

/**
 * Postgres (dajeong_* tables) is the operational source of truth once DAJEONG_DATABASE_URL is
 * set — see dajeong/lib/db.ts. The JSON file store (.data/dajeong/companions.json) only exists
 * as a zero-setup local-dev fallback so `npm test`/`npm run dev` work without a live database.
 * In a real deployment (VERCEL=1 or NODE_ENV=production) with no DB configured, this fails loudly
 * instead of silently running on ephemeral disk that a redeploy wipes — that's the one place a
 * missing env var should surface as a clear error rather than a confusing runtime symptom later.
 */
function isDeployed(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

function backend(): typeof dbStore | typeof fileStore {
  if (isDatabaseConfigured()) return dbStore;
  if (isDeployed()) {
    throw new Error(
      "하루위드 동반자/공유 기능은 DAJEONG_DATABASE_URL이 설정된 운영 DB가 필요해요. " +
      "이 배포에는 설정되어 있지 않아요 — 파일 저장소는 로컬 개발 전용 대체 수단입니다.",
    );
  }
  return fileStore;
}

export const upsertPerson: typeof dbStore.upsertPerson = (...args) => backend().upsertPerson(...args);
export const createInvite: typeof dbStore.createInvite = (...args) => backend().createInvite(...args);
export const listInvitesFrom: typeof dbStore.listInvitesFrom = (...args) => backend().listInvitesFrom(...args);
export const findLink: typeof dbStore.findLink = (...args) => backend().findLink(...args);
export const acceptInvite: typeof dbStore.acceptInvite = (...args) => backend().acceptInvite(...args);
export const listCompanions: typeof dbStore.listCompanions = (...args) => backend().listCompanions(...args);
export const removeCompanion: typeof dbStore.removeCompanion = (...args) => backend().removeCompanion(...args);
export const getPace: typeof dbStore.getPace = (...args) => backend().getPace(...args);
export const upsertPace: typeof dbStore.upsertPace = (...args) => backend().upsertPace(...args);
export const getSharedPlanRecord: typeof dbStore.getSharedPlanRecord = (...args) => backend().getSharedPlanRecord(...args);
export const listSharedWithMe: typeof dbStore.listSharedWithMe = (...args) => backend().listSharedWithMe(...args);
export const listMySharedPlans: typeof dbStore.listMySharedPlans = (...args) => backend().listMySharedPlans(...args);
export const listAllSharedPlans: typeof dbStore.listAllSharedPlans = (...args) => backend().listAllSharedPlans(...args);
export const shareplan: typeof dbStore.shareplan = (...args) => backend().shareplan(...args);
export const unshareplan: typeof dbStore.unshareplan = (...args) => backend().unshareplan(...args);
export const publishSharedPlan: typeof dbStore.publishSharedPlan = (...args) => backend().publishSharedPlan(...args);
