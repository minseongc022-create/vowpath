import Link from "next/link";
import { AppHeader } from "@/components/app/AppHeader";
import { ROUTES } from "@/lib/constants";
import { Container } from "@/components/ui/Container";
import { isEnglishUi } from "@/lib/locale";

type Section = { heading: string; body: string };

type LegalDocumentProps = {
  title: string;
  updated: string;
  sections: Section[];
};

export function LegalDocument({ title, updated, sections }: LegalDocumentProps) {
  return (
    <div className="min-h-screen bg-surface-muted">
      <AppHeader />
      <Container className="py-12 sm:py-16">
        <article className="mx-auto max-w-2xl rounded-xl border border-surface-border bg-white p-8 shadow-card">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isEnglishUi() ? "Last updated:" : "최종 업데이트:"} {updated}
          </p>
          <div className="mt-8 space-y-6">
            {sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-lg font-semibold text-slate-900">{s.heading}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </section>
            ))}
          </div>
          <p className="mt-10">
            <Link
              href={ROUTES.home}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              {isEnglishUi() ? "← Back to home" : "← 홈으로"}
            </Link>
          </p>
        </article>
      </Container>
    </div>
  );
}
