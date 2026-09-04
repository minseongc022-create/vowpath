import Link from "next/link";

const COMPETITORS = [
  { name: "엑셀 + 카카오톡", problem: "견적 실수, 배차 누락, 고객 불안" },
  { name: "Shifton 등 해외 FSM", problem: "한국 이사 용어·평수·사다리차 미지원" },
  { name: "플러그/싸인플로", problem: "견적서만 됨, 배차·기사앱·고객안내 없음" },
  { name: "다이사 등 비교 플랫폼", problem: "고객용, 업체 운영툴 아님" },
];

const FEATURES = [
  {
    title: "3분 견적",
    desc: "평수·거리·엘리베이터만 넣으면 이사업체 단가표로 자동 계산",
  },
  {
    title: "카톡 링크 공유",
    desc: "고객이 모바일에서 견적 확인 → 계약 확정 버튼",
  },
  {
    title: "원클릭 배차",
    desc: "팀/트럭 배정하면 기사에게 작업 정보 자동 전달",
  },
  {
    title: "고객 실시간 안내",
    desc: "짐 싣는 중 → 이동 중 → 완료, 고객이 링크로 확인",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black text-white">
            짐
          </span>
          <span className="text-lg font-bold">짐루트</span>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          데모 시작
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20">
        <section className="py-12 text-center">
          <p className="text-sm font-semibold text-orange-600">
            한국 소형 이사업체 전용 SaaS
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            견적 → 배차 → 고객안내
            <br />
            <span className="text-orange-500">카톡 대신 5분</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            경쟁사는 있지만 대부분 엑셀이거나 해외 툴이야.
            짐루트는 평수·사다리차·반포장 옵션까지 한국 이사업에 맞춰
            만들었어.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard/quotes/new"
              className="rounded-2xl bg-orange-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-200 hover:bg-orange-600"
            >
              견적 만들어보기
            </Link>
            <Link
              href="/dashboard"
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700"
            >
              대시보드 보기
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            월 29,900원 · 고객 40곳이면 순수익 1,000만 원+
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-bold">왜 지금 대장 할 수 있나</h2>
          <p className="mt-2 text-slate-600">
            경쟁이 없는 게 아니라, <strong>형편없는 경쟁</strong>이 있는 시장.
          </p>
          <div className="mt-6 space-y-3">
            {COMPETITORS.map((c) => (
              <div
                key={c.name}
                className="flex flex-col gap-1 rounded-xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-semibold text-slate-800">{c.name}</span>
                <span className="text-sm text-red-600">✕ {c.problem}</span>
              </div>
            ))}
            <div className="flex flex-col gap-1 rounded-xl bg-orange-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold text-orange-800">짐루트</span>
              <span className="text-sm text-orange-700">
                ✓ 한국 이사 전용 · 견적+배차+고객안내 한 화면
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
