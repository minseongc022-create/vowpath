import { OFFICIAL_TOPIK_RESOURCES, COMMUNITY_TIPS_VI } from "@/topik/lib/official-resources";
import { vi } from "@/topik/lib/i18n/vi";

export function OfficialResourcesCard() {
  return (
    <section className="topik-official-section">
      <p className="topik-section-title">{vi.official.title}</p>
      <p className="topik-official-hint">{vi.official.subtitle}</p>
      <div className="topik-official-list">
        {OFFICIAL_TOPIK_RESOURCES.map((r) => (
          <a
            key={r.id}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="topik-official-link"
          >
            <span className="topik-official-link-body">
              <span className="topik-official-link-title">{r.titleVi}</span>
              <span className="topik-official-link-desc">{r.descVi}</span>
            </span>
            {r.badge && <span className="topik-badge">{r.badge}</span>}
          </a>
        ))}
      </div>
      <ul className="topik-community-tips">
        {COMMUNITY_TIPS_VI.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </section>
  );
}
