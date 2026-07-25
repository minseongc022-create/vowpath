"use client";

import { useCallback, useEffect, useState } from "react";
import type { TechAssignment, TechMember } from "@/lib/tech-dispatch/types";
import { clientFetch, redirectToLoginIfUnauthorized } from "@/lib/client-fetch";
import { ROUTES } from "@/lib/constants";
import { useLocale } from "@/components/providers/LocaleProvider";

const STATUS_LABELS_EN: Record<TechAssignment["status"], string> = {
  offering: "Waiting for crew reply",
  accepted: "Crew assigned",
  declined_all: "All crew passed",
  unassigned: "Could not reach crew",
};

const STATUS_LABELS_KO: Record<TechAssignment["status"], string> = {
  offering: "기사 답장 대기 중",
  accepted: "기사 배정됨",
  declined_all: "모든 기사가 패스함",
  unassigned: "기사에게 연락하지 못함",
};

type CrewAssignPanelProps = {
  bookingId: string;
};

export function CrewAssignPanel({ bookingId }: CrewAssignPanelProps) {
  const { isEnglish } = useLocale();
  const statusLabels = isEnglish ? STATUS_LABELS_EN : STATUS_LABELS_KO;
  const [assignment, setAssignment] = useState<TechAssignment | null>(null);
  const [crew, setCrew] = useState<TechMember[]>([]);
  const [selectedTechId, setSelectedTechId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignRes, crewRes] = await Promise.all([
        clientFetch(
          `/api/shop/tech-dispatch/assignment?bookingId=${encodeURIComponent(bookingId)}`,
        ),
        clientFetch("/api/shop/tech-dispatch/assign"),
      ]);
      if (redirectToLoginIfUnauthorized(assignRes)) return;
      const assignData = (await assignRes.json()) as { assignment?: TechAssignment | null };
      setAssignment(assignData.assignment ?? null);
      if (crewRes.ok) {
        const crewData = (await crewRes.json()) as { crew?: TechMember[] };
        setCrew(crewData.crew ?? []);
      }
    } catch {
      setAssignment(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAssign(mode: "auto" | "manual") {
    setSaving(true);
    setError(null);
    try {
      const res = await clientFetch("/api/shop/tech-dispatch/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          mode,
          techId: mode === "manual" ? selectedTechId : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; assignment?: TechAssignment };
      if (!res.ok) {
        throw new Error(
          data.error ?? (isEnglish ? "Assign failed" : "배정에 실패했습니다"),
        );
      }
      setAssignment(data.assignment ?? null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isEnglish
            ? "Assign failed"
            : "배정에 실패했습니다",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-stone-600">
        {isEnglish ? "Loading crew assignment…" : "기사 배정 불러오는 중…"}
      </div>
    );
  }

  if (!crew.length && !assignment) {
    return (
      <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-4 space-y-2">
        <p className="text-sm font-semibold text-brand-900">
          {isEnglish ? "Crew assignment" : "기사 배정"}
        </p>
        <p className="text-sm text-stone-700">
          {isEnglish ? "No crew members set up yet." : "아직 등록된 기사가 없습니다."}
        </p>
        <p className="text-xs text-stone-600">
          {isEnglish
            ? "Add techs in Settings to text accept/pass offers from this booking."
            : "설정에서 기사를 추가하면 이 요청에서 수락/패스 문자를 보낼 수 있습니다."}
        </p>
        <a
          href={ROUTES.settings}
          className="inline-block text-sm font-semibold text-brand-700 underline"
        >
          {isEnglish ? "Add crew in Settings" : "설정에서 기사 추가"}
        </a>
      </div>
    );
  }

  const pending = assignment?.offers.find((o) => o.outcome === "pending");

  return (
    <div className="rounded-xl border border-brand-200/70 bg-brand-50/30 p-4 space-y-3">
      <p className="text-sm font-semibold text-brand-900">
        {isEnglish ? "Crew assignment" : "기사 배정"}
      </p>

      {assignment ? (
        <>
          <p className="text-sm text-stone-700">{statusLabels[assignment.status]}</p>
          {assignment.status === "accepted" && assignment.assignedTechName ? (
            <p className="text-sm text-stone-800">
              {isEnglish ? "Assigned:" : "배정:"}{" "}
              <span className="font-medium">{assignment.assignedTechName}</span>
            </p>
          ) : null}
          {assignment.status === "offering" && pending ? (
            <p className="text-sm text-stone-800">
              {isEnglish ? "Offer sent to" : "제안 보냄:"}{" "}
              <span className="font-medium">{pending.techName}</span>
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-stone-600">
          {isEnglish ? "No crew assigned yet." : "아직 배정된 기사가 없습니다."}
        </p>
      )}

      {crew.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2 pt-1">
          <label className="block min-w-[10rem] flex-1">
            <span className="text-xs font-medium text-stone-600">
              {isEnglish ? "Assign to" : "배정 대상"}
            </span>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">{isEnglish ? "Select crew…" : "기사 선택…"}</option>
              {crew.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name.trim() || t.phone}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={saving || !selectedTechId}
            onClick={() => void runAssign("manual")}
            className="rounded-lg bg-brand-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isEnglish ? "Assign" : "배정"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void runAssign("auto")}
            className="rounded-lg border border-brand-300 bg-white px-3 py-2 text-sm font-semibold text-brand-900 disabled:opacity-50"
          >
            {isEnglish ? "Auto-offer" : "자동 제안"}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
