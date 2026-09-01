import type { DajeongPlan, ReservationOrder, ReservationTask } from "./types";

/**
 * Builds an honest execution order. A task is automatic only when a real
 * provider adapter marked the place as supported; everything else stays on
 * the shortest official booking path and can never be reported as booked.
 */
export function prepareReservationOrder(plan: DajeongPlan): ReservationOrder {
  const tasks: ReservationTask[] = plan.items
    .filter((item) => item.reservationRequired)
    .map((item) => {
      const automatic = item.reality?.reservationState === "supported";
      return {
        id: `reserve_${plan.id}_${item.id}`,
        itemId: item.id,
        title: item.title,
        time: item.time,
        capability: automatic ? "automatic" as const : "assisted" as const,
        status: automatic ? "needs_approval" as const : "user_action" as const,
        providerLabel: automatic ? "연결된 예약 파트너" : item.provider,
        bookingUrl: item.reality?.websiteUrl || item.reality?.detailsUrl || item.href,
        explanation: automatic
          ? "실시간 좌석과 예약금을 확인한 뒤, 최종 승인 후 온이가 예약해요."
          : "이곳은 자동 예약 제휴가 아직 없어 공식 예약 화면의 가장 짧은 경로를 열어드려요.",
      };
    });
  const automaticCount = tasks.filter((task) => task.capability === "automatic").length;
  const assistedCount = tasks.length - automaticCount;
  return {
    id: `order_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    planId: plan.id,
    createdAt: new Date().toISOString(),
    status: assistedCount > 0 ? "partially_manual" : tasks.length ? "needs_approval" : "completed",
    tasks,
    depositTotal: tasks.reduce((sum, task) => sum + (task.depositAmount ?? 0), 0),
    message: tasks.length === 0
      ? "예약이 필요한 일정은 없어요. 바로 방문할 곳만 영업시간을 다시 확인해 드릴게요."
      : assistedCount > 0
        ? `예약이 필요한 ${tasks.length}곳을 정리했어요. 자동 제휴가 없는 ${assistedCount}곳은 예약된 척하지 않고 공식 예약 화면으로 바로 연결할게요.`
        : `예약이 필요한 ${tasks.length}곳의 좌석과 예약금을 확인할 준비가 됐어요. 결제 전 금액을 보여드리고 한 번 더 승인받을게요.`,
  };
}
