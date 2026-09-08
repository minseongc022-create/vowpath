import type { ElevatorType, MoveType, QuoteLineItem } from "./types";

const MOVE_TYPE_LABEL: Record<MoveType, string> = {
  full: "포장이사",
  semi: "반포장이사",
  cargo: "용달/화물",
  office: "사무실이사",
};

const ELEVATOR_LABEL: Record<ElevatorType, string> = {
  yes: "엘리베이터 있음",
  no: "계단 이용",
  ladder: "사다리차 필요",
};

export interface QuoteInput {
  moveType: MoveType;
  pyung: number;
  distanceKm: number;
  fromElevator: ElevatorType;
  toElevator: ElevatorType;
  packingBoxes?: number;
  storageDays?: number;
}

function baseByPyung(pyung: number, moveType: MoveType): number {
  const rate =
    moveType === "full" ? 180_000 :
    moveType === "semi" ? 120_000 :
    moveType === "office" ? 150_000 :
    90_000;
  return Math.max(pyung, 10) * rate;
}

function distanceFee(km: number): number {
  if (km <= 10) return 0;
  if (km <= 30) return (km - 10) * 8_000;
  return 20 * 8_000 + (km - 30) * 12_000;
}

function elevatorFee(type: ElevatorType, floors = 3): number {
  if (type === "yes") return 0;
  if (type === "ladder") return 180_000;
  return Math.max(floors - 1, 1) * 15_000;
}

export function buildQuoteLineItems(input: QuoteInput): QuoteLineItem[] {
  const items: QuoteLineItem[] = [];
  const base = baseByPyung(input.pyung, input.moveType);

  items.push({
    id: "base",
    label: `${MOVE_TYPE_LABEL[input.moveType]} (${input.pyung}평 기준)`,
    amount: base,
  });

  const dist = distanceFee(input.distanceKm);
  if (dist > 0) {
    items.push({
      id: "distance",
      label: `거리 추가 (${input.distanceKm}km)`,
      amount: dist,
    });
  }

  const fromFee = elevatorFee(input.fromElevator);
  if (fromFee > 0) {
    items.push({
      id: "from-elevator",
      label: `출발지 ${ELEVATOR_LABEL[input.fromElevator]}`,
      amount: fromFee,
    });
  }

  const toFee = elevatorFee(input.toElevator);
  if (toFee > 0) {
    items.push({
      id: "to-elevator",
      label: `도착지 ${ELEVATOR_LABEL[input.toElevator]}`,
      amount: toFee,
    });
  }

  if (input.packingBoxes && input.packingBoxes > 0) {
    items.push({
      id: "boxes",
      label: `박스 포장 (${input.packingBoxes}개)`,
      amount: input.packingBoxes * 3_500,
    });
  }

  if (input.storageDays && input.storageDays > 0) {
    items.push({
      id: "storage",
      label: `짐보관 (${input.storageDays}일)`,
      amount: input.storageDays * 25_000,
    });
  }

  return items;
}

export function quoteTotal(items: QuoteLineItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export const MOVE_TYPE_OPTIONS: { value: MoveType; label: string }[] = [
  { value: "full", label: "포장이사" },
  { value: "semi", label: "반포장이사" },
  { value: "cargo", label: "용달/화물" },
  { value: "office", label: "사무실이사" },
];

export const ELEVATOR_OPTIONS: { value: ElevatorType; label: string }[] = [
  { value: "yes", label: "엘리베이터 있음" },
  { value: "no", label: "계단 이용" },
  { value: "ladder", label: "사다리차 필요" },
];

export const STATUS_LABEL: Record<string, string> = {
  quote: "견적 발송",
  confirmed: "계약 확정",
  dispatched: "배차 완료",
  loading: "짐 싣는 중",
  moving: "이동 중",
  done: "완료",
  cancelled: "취소",
};
