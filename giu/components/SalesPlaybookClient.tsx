"use client";

import { CopyBlock, CopyLink } from "@/giu/components/CopyBlock";
import {
  GIU_OBJECTIONS,
  GIU_TARGET_DISTRICTS,
  GIU_WEEK_ONE_PLAN,
  type SalesTemplate,
} from "@/giu/lib/sales-playbook";
import { giuSalesUrls } from "@/giu/lib/urls";

type Props = {
  origin: string;
  templates: SalesTemplate[];
};

export function SalesPlaybookClient({ origin, templates }: Props) {
  const urls = giuSalesUrls(origin);

  return (
    <div className="space-y-12">
      <section className="rounded-2xl border border-giu-accent/30 bg-giu-accent/5 p-6">
        <h2 className="text-lg font-bold text-giu-ink">🔗 Link gửi khách / quán</h2>
        <p className="mt-1 text-sm text-giu-muted">한국어: Zalo·DM에 아래 링크 복사해서 붙여넣기</p>
        <div className="mt-4 space-y-3">
          <CopyLink href={urls.merchantSignup()} />
          <CopyLink href={urls.boxes()} />
          <CopyLink href={urls.merchantPanel()} />
          <CopyLink href={urls.merchantFlyer()} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-giu-ink">📅 Tuần 1 — kế hoạch</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-giu-border text-giu-muted">
                <th className="py-2 pr-4">Ngày</th>
                <th className="py-2 pr-4">한국어</th>
                <th className="py-2">Tiếng Việt</th>
              </tr>
            </thead>
            <tbody>
              {GIU_WEEK_ONE_PLAN.map((row) => (
                <tr key={row.day} className="border-b border-giu-border/60">
                  <td className="py-3 pr-4 font-semibold text-giu-primary">{row.day}</td>
                  <td className="py-3 pr-4 text-giu-ink">{row.ko}</td>
                  <td className="py-3 text-giu-muted">{row.vi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-giu-ink">📍 Quận ưu tiên</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {GIU_TARGET_DISTRICTS.map((d) => (
            <span
              key={d}
              className="rounded-full bg-giu-primary/10 px-3 py-1 text-sm font-medium text-giu-primary"
            >
              {d}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-lg font-bold text-giu-ink">💬 Mẫu Zalo / DM</h2>
        {templates.map((t) => (
          <div key={t.id}>
            <h3 className="font-semibold text-giu-ink">{t.titleVi}</h3>
            <p className="text-xs text-giu-muted">{t.titleKo}</p>
            {t.noteKo ? <p className="mt-1 text-xs text-giu-accent">{t.noteKo}</p> : null}
            <div className="mt-3">
              <CopyBlock text={t.body} />
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-bold text-giu-ink">❓ Câu hỏi thường gặp (quán)</h2>
        <ul className="mt-4 space-y-4">
          {GIU_OBJECTIONS.map((item) => (
            <li key={item.q} className="rounded-xl border border-giu-border bg-white p-4">
              <p className="font-medium text-giu-ink">{item.q}</p>
              <p className="mt-2 text-sm text-giu-muted">{item.a}</p>
              <p className="mt-1 text-xs text-giu-accent">{item.ko}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
