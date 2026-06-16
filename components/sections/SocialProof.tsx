import { siteSocialProof } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";

export function SocialProof() {
  const s = siteSocialProof;
  return (
    <section className="vow-site-section py-16 sm:py-20">
      <Container>
        <h2 className="text-center text-2xl font-bold text-white">{s.title}</h2>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {s.items.map((item) => (
            <div key={item.label} className="vow-site-card p-5 text-center">
              <p className="text-2xl font-bold text-teal-200">{item.stat}</p>
              <p className="mt-1 text-xs text-slate-400">{item.label}</p>
            </div>
          ))}
        </div>
        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {s.badges.map((badge) => (
            <li key={badge} className="hvac-badge-dark text-xs">
              {badge}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
