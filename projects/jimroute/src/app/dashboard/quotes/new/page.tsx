"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, Card, Input, Select, Textarea } from "@/components/ui";
import { formatKRW } from "@/lib/format";
import {
  buildQuoteLineItems,
  ELEVATOR_OPTIONS,
  MOVE_TYPE_OPTIONS,
  quoteTotal,
} from "@/lib/quote-calculator";
import { getCompany, saveJob } from "@/lib/store";
import type { ElevatorType, Job, MoveType } from "@/lib/types";

export default function NewQuotePage() {
  const router = useRouter();
  const company = getCompany();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [moveDate, setMoveDate] = useState("");
  const [moveType, setMoveType] = useState<MoveType>("semi");
  const [pyung, setPyung] = useState(20);
  const [distanceKm, setDistanceKm] = useState(10);
  const [fromLine, setFromLine] = useState("");
  const [toLine, setToLine] = useState("");
  const [fromElevator, setFromElevator] = useState<ElevatorType>("yes");
  const [toElevator, setToElevator] = useState<ElevatorType>("yes");
  const [packingBoxes, setPackingBoxes] = useState(0);
  const [notes, setNotes] = useState("");

  const lineItems = useMemo(
    () =>
      buildQuoteLineItems({
        moveType,
        pyung,
        distanceKm,
        fromElevator,
        toElevator,
        packingBoxes: packingBoxes || undefined,
      }),
    [moveType, pyung, distanceKm, fromElevator, toElevator, packingBoxes],
  );

  const total = quoteTotal(lineItems);
  const deposit = Math.round(total * company.depositRate);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const job: Job = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      customerName,
      customerPhone,
      moveDate,
      moveType,
      pyung,
      distanceKm,
      from: { line: fromLine, elevator: fromElevator },
      to: { line: toLine, elevator: toElevator },
      lineItems,
      total,
      deposit,
      status: "quote",
      notes,
      statusHistory: [{ status: "quote", at: new Date().toISOString() }],
    };
    saveJob(job);
    router.push(`/q/${job.id}`);
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold">새 견적</h1>
        <p className="text-sm text-slate-500">
          3분 안에 견적서 만들고 링크로 보내세요
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="space-y-4">
          <h2 className="font-bold">고객 정보</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="고객명"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="홍길동"
            />
            <Input
              label="연락처"
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>
          <Input
            label="이사 예정일"
            type="date"
            required
            value={moveDate}
            onChange={(e) => setMoveDate(e.target.value)}
          />

          <h2 className="pt-2 font-bold">이사 조건</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="이사 종류"
              value={moveType}
              onChange={(e) => setMoveType(e.target.value as MoveType)}
            >
              {MOVE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Input
              label="평수"
              type="number"
              min={10}
              value={pyung}
              onChange={(e) => setPyung(Number(e.target.value))}
            />
            <Input
              label="거리 (km)"
              type="number"
              min={1}
              value={distanceKm}
              onChange={(e) => setDistanceKm(Number(e.target.value))}
            />
            <Input
              label="박스 포장 (개)"
              type="number"
              min={0}
              value={packingBoxes}
              onChange={(e) => setPackingBoxes(Number(e.target.value))}
            />
          </div>

          <h2 className="pt-2 font-bold">주소</h2>
          <Input
            label="출발지"
            required
            value={fromLine}
            onChange={(e) => setFromLine(e.target.value)}
            placeholder="서울 강남구 ..."
          />
          <Select
            label="출발지 엘리베이터"
            value={fromElevator}
            onChange={(e) => setFromElevator(e.target.value as ElevatorType)}
          >
            {ELEVATOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            label="도착지"
            required
            value={toLine}
            onChange={(e) => setToLine(e.target.value)}
            placeholder="경기 성남시 ..."
          />
          <Select
            label="도착지 엘리베이터"
            value={toElevator}
            onChange={(e) => setToElevator(e.target.value as ElevatorType)}
          >
            {ELEVATOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Textarea
            label="특이사항"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="오전 9시 도착 희망, 피아노 있음 등"
          />
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="font-bold">견적 미리보기</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {lineItems.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between gap-4 border-b border-slate-100 pb-2"
                >
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-medium">{formatKRW(item.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>합계</span>
                <span className="text-orange-600">{formatKRW(total)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm text-slate-500">
                <span>계약금 ({company.depositRate * 100}%)</span>
                <span>{formatKRW(deposit)}</span>
              </div>
            </div>
          </Card>
          <Button type="submit" className="w-full">
            견적서 생성 & 링크 받기
          </Button>
        </div>
      </form>
    </div>
  );
}
