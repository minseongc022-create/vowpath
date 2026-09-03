import "server-only";

import { isDatabaseConfigured } from "./db";
import * as dbStore from "./notification-store-db";
import * as fileStore from "./notification-store-file";

export type { RegisteredPlan } from "./notification-store-file";

/** Same fallback/fail-fast contract as companion-store.ts — see its comment for the reasoning.
 * Scheduled notifications in particular must never silently live only on a serverless
 * function's ephemeral disk in production: a redeploy would wipe every pending reminder. */
function isDeployed(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

function backend(): typeof dbStore | typeof fileStore {
  if (isDatabaseConfigured()) return dbStore;
  if (isDeployed()) {
    throw new Error(
      "하루위드 알림 기능은 DAJEONG_DATABASE_URL이 설정된 운영 DB가 필요해요. " +
      "이 배포에는 설정되어 있지 않아요 — 파일 저장소는 로컬 개발 전용 대체 수단입니다.",
    );
  }
  return fileStore;
}

export const getPreferences: typeof dbStore.getPreferences = (...args) => backend().getPreferences(...args);
export const setPreferences: typeof dbStore.setPreferences = (...args) => backend().setPreferences(...args);
export const addSubscription: typeof dbStore.addSubscription = (...args) => backend().addSubscription(...args);
export const removeSubscription: typeof dbStore.removeSubscription = (...args) => backend().removeSubscription(...args);
export const removeAllSubscriptionsForPerson: typeof dbStore.removeAllSubscriptionsForPerson = (...args) => backend().removeAllSubscriptionsForPerson(...args);
export const listSubscriptions: typeof dbStore.listSubscriptions = (...args) => backend().listSubscriptions(...args);
export const removeSubscriptionById: typeof dbStore.removeSubscriptionById = (...args) => backend().removeSubscriptionById(...args);
export const registerPlanForNotifications: typeof dbStore.registerPlanForNotifications = (...args) => backend().registerPlanForNotifications(...args);
export const unregisterPlan: typeof dbStore.unregisterPlan = (...args) => backend().unregisterPlan(...args);
export const listRegisteredPlans: typeof dbStore.listRegisteredPlans = (...args) => backend().listRegisteredPlans(...args);
export const getRegisteredPlan: typeof dbStore.getRegisteredPlan = (...args) => backend().getRegisteredPlan(...args);
export const getWeatherDigest: typeof dbStore.getWeatherDigest = (...args) => backend().getWeatherDigest(...args);
export const setWeatherDigest: typeof dbStore.setWeatherDigest = (...args) => backend().setWeatherDigest(...args);
export const reconcileNotifications: typeof dbStore.reconcileNotifications = (...args) => backend().reconcileNotifications(...args);
export const dueNotifications: typeof dbStore.dueNotifications = (...args) => backend().dueNotifications(...args);
export const markSent: typeof dbStore.markSent = (...args) => backend().markSent(...args);
export const markFailed: typeof dbStore.markFailed = (...args) => backend().markFailed(...args);
export const listNotificationsForPerson: typeof dbStore.listNotificationsForPerson = (...args) => backend().listNotificationsForPerson(...args);
