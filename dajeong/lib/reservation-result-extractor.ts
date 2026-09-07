import "server-only";

import { z } from "zod";
import { openAiJsonCompletion } from "@/lib/openai-json";
import type { ProviderTranscript } from "./reservation-queue";
import type { ReservationJob, StructuredReservationResult } from "./reservation-ops-types";

const moneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.literal("KRW").default("KRW"),
  method: z.enum(["deposit", "minimum_spend", "seat_fee", "preorder", "other"]).optional(),
  paymentMethod: z.enum(["bank_transfer", "payment_link", "card", "unknown"]).optional(),
  paymentLink: z.string().url().optional(),
  accountHint: z.string().max(120).optional(),
  deadline: z.string().max(80).optional(),
});

const resultSchema = z.object({
  status: z.enum(["confirmed", "unavailable", "needs_user_action", "walk_in_only", "duplicate_found", "wrong_number", "inconclusive"]),
  confirmedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  confirmedTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  alternativeDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(10).optional(),
  alternativeTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).max(10).optional(),
  partySize: z.number().int().positive().max(100).optional(),
  reservationName: z.string().max(80).optional(),
  venue: z.string().min(1).max(160),
  seat: z.string().max(80).optional(),
  tableArrangement: z.string().max(160).optional(),
  durationMinutes: z.number().int().positive().max(720).optional(),
  deposit: moneySchema.optional(),
  minimumSpend: moneySchema.optional(),
  additionalFees: z.array(moneySchema).max(10).optional(),
  preorder: z.array(z.string().max(160)).max(20).optional(),
  cancellationPolicy: z.string().max(500).optional(),
  operatingConstraints: z.array(z.string().max(240)).max(20).optional(),
  venuePolicies: z.object({ parking: z.string().max(160).optional(), cake: z.string().max(160).optional(), corkage: z.string().max(160).optional(), children: z.string().max(160).optional(), pets: z.string().max(160).optional() }).optional(),
  followUp: z.object({ channel: z.enum(["sms", "phone", "payment_link", "bank_transfer", "other"]), status: z.enum(["expected", "received", "required"]), details: z.string().max(240).optional() }).optional(),
  specialConditions: z.array(z.string().max(240)).max(30).optional(),
  failureReason: z.string().max(500).optional(),
  requiresUserAction: z.boolean(),
  retryRecommended: z.boolean(),
  confidence: z.number().min(0).max(1),
  finalReadbackConfirmed: z.boolean(),
  contradiction: z.string().max(500).optional(),
});

export async function extractReservationResult(job: ReservationJob, transcript: ProviderTranscript): Promise<StructuredReservationResult> {
  const transcriptText = (transcript.segments ?? []).map((segment, index) => `${index + 1}. [${segment.speaker}] ${segment.text}`).join("\n");
  if (!transcriptText.trim()) throw new Error("EMPTY_CALL_TRANSCRIPT");
  const result = await openAiJsonCompletion<unknown>({
    model: process.env.HARUWITH_RESERVATION_RESULT_MODEL?.trim() || undefined,
    temperature: 0,
    system: [
      "한국 식당 예약 통화의 구조화 판독기다. 화자 라벨은 역할을 보장하지 않으므로 대화 의미로 판단한다.",
      "직원의 자유로운 한 문장에 여러 조건이 섞여 있어도 대안 날짜/시간, 좌석·테이블 배치, 이용시간, 예약금, 추가요금, 최소주문, 선주문, 브레이크타임·라스트오더, 주차·케이크·콜키지·노키즈·반려동물, 문자/결제 후속조치를 각각 분리한다.",
      "통화 연결·종료만으로 예약 성공이라 판단하지 않는다. 날짜·시간·인원·예약자명의 최종 readback과 직원 확인이 모두 명확해야 finalReadbackConfirmed=true다.",
      "새 돈, HARD 조건 변경, 허용범위 밖 대안, 모순, 결제·문자 링크 대기는 requiresUserAction=true다.",
      "카드번호/CVV 같은 원문 개인정보를 결과에 복사하지 않는다. 추측하지 말고 불명확하면 inconclusive와 낮은 confidence를 쓴다.",
      "JSON 객체만 반환한다.",
    ].join("\n"),
    user: JSON.stringify({ goal: job.goal, transcript: transcriptText }),
  });
  return resultSchema.parse(result) as StructuredReservationResult;
}
