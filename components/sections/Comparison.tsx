import { siteComparison } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Comparison() {
  const c = siteComparison;
  return (
    <section className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading title={c.title} subtitle={c.subtitle} />
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {c.headers.map((h, i) => (
                  <th
                    key={h || "feature"}
                    className={`px-4 py-3 font-semibold ${
                      i === 1 ? "text-violet-300" : "text-slate-400"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.rows.map((row) => (
                <tr key={row[0]} className="border-b border-white/[0.06]">
                  <td className="px-4 py-3 font-medium text-slate-200">{row[0]}</td>
                  <td className="px-4 py-3 text-emerald-300/90">{row[1]}</td>
                  <td className="px-4 py-3 text-slate-500">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  );
}
