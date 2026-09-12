import "server-only";

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { vibesafePrisma: PrismaClient | undefined };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.vibesafePrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.vibesafePrisma = prisma;
}

/**
 * VibeSafe의 DB 사용 여부 플래그.
 *
 * 이 저장소의 다른 제품(Learn/하루위드)과 같은 방식이다 — 실제 접속 문자열은
 * 공용 `DATABASE_URL`이고, 제품별 플래그를 따로 둬서 한 제품의 환경변수 설정이
 * 다른 제품을 조용히 켜버리지 못하게 한다. 운영자는 `VIBESAFE_DATABASE_URL`에
 * `DATABASE_URL`과 같은 값을 넣으면 된다.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.VIBESAFE_DATABASE_URL?.trim());
}

/**
 * VibeSafe는 파일 저장소 대체 경로를 두지 않는다.
 *
 * 하루위드는 로컬 개발 편의를 위해 파일 저장소를 뒀지만, VibeSafe가 다루는
 * 것은 남의 GitHub 토큰과 production URL이다. "DB가 없으면 파일에 저장"은
 * 그 값들이 어딘가의 디스크에 평문으로 눕는다는 뜻이라 애초에 만들지 않는다.
 */
export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "VibeSafe는 데이터베이스가 필요합니다. VIBESAFE_DATABASE_URL(과 DATABASE_URL)을 설정하세요.",
    );
    this.name = "DatabaseNotConfiguredError";
  }
}

export function assertDatabase(): void {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
}
