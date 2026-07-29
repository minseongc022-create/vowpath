"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MATCHCUT_API, MATCHCUT_ROUTES } from "@/lib/matchcut/constants";

type ProjectRow = {
  id: string;
  title: string;
  sourceUrl: string;
  platform?: string;
  status: string;
  creditsUsed: number;
  createdAt: string;
  updatedAt: string;
  hasAngles: boolean;
};

export function MatchCutProjectsList() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(MATCHCUT_API.projects);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "로드 실패");
      setProjects(data.projects ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("이 프로젝트를 삭제할까요?")) return;
    await fetch(`${MATCHCUT_API.projects}?id=${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">프로젝트 히스토리</h1>
          <p className="text-sm text-slate-500">매칭·생성한 소싱 작업을 다시 확인합니다.</p>
        </div>
        <Link
          href={MATCHCUT_ROUTES.app}
          className="rounded-xl bg-trust-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trust-700"
        >
          새 작업
        </Link>
      </div>

      {loading && <p className="text-sm text-slate-500">불러오는 중…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && projects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-600">아직 프로젝트가 없습니다.</p>
          <Link
            href={MATCHCUT_ROUTES.app}
            className="mt-4 inline-block text-sm font-semibold text-trust-600"
          >
            스튜디오에서 시작 →
          </Link>
        </div>
      )}

      <ul className="space-y-3">
        {projects.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{p.title}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{p.sourceUrl}</p>
              <p className="mt-2 text-xs text-slate-500">
                {p.platform ?? "—"} · {p.status} · {p.creditsUsed}크레딧 ·{" "}
                {new Date(p.updatedAt).toLocaleString("ko-KR")}
                {p.hasAngles ? " · 상세컷 있음" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`${MATCHCUT_ROUTES.app}?project=${p.id}`}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
              >
                열기
              </Link>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="rounded-lg border border-red-100 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
