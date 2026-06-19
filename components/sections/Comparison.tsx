import { siteComparison } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Comparison() {
  const c = siteComparison;
  return (
    <section id={c.id} className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading title={c.title} subtitle={c.subtitle} />
        <div className="mt-10 overflow-x-auto">
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
