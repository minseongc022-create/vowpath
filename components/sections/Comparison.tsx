import { siteComparison } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Comparison() {
  const c = siteComparison;
  const [, col1, col2, col3] = c.headers;
  return (
    <section id={c.id} className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading title={c.title} subtitle={c.subtitle} />

        {/* Mobile: card per row */}
        <div className="mt-10 space-y-3 md:hidden">
          {c.rows.map((row) => (
            <div key={row[0]} className="rounded-xl border border-brand-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-stone-800">{row[0]}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand-700">{col1}</span>
                  <span className="text-xs font-medium text-emerald-700">{row[1]}</span>
                </div>
                <div className="flex items-center justify-between border-t border-brand-100 pt-2">
                  <span className="text-xs text-stone-500">{col2}</span>
                  <span className="text-xs text-slate-500">{row[2]}</span>
                </div>
                <div className="flex items-center justify-between border-t border-brand-100 pt-2">
                  <span className="text-xs text-stone-500">{col3}</span>
                  <span className="text-xs text-slate-500">{row[3]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: full table */}
        <div className="mt-10 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {c.headers.map((h, i) => (
                  <th
                    key={h || "feature"}
                    className={`px-4 py-3 font-semibold ${
                      i === 1 ? "text-brand-700" : "text-stone-700"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.rows.map((row) => (
                <tr key={row[0]} className="border-b border-brand-200/80">
                  <td className="px-4 py-3 font-medium text-stone-700">{row[0]}</td>
                  <td className="px-4 py-3 font-medium text-emerald-700">{row[1]}</td>
                  <td className="px-4 py-3 text-slate-500">{row[2]}</td>
                  <td className="px-4 py-3 text-slate-500">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  );
}
