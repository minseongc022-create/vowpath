import { vi } from "@/topik/lib/i18n/vi";
import { HOME_FAVORITE_MODES, getStudyMode } from "@/topik/lib/study-modes";
import { TopikModeTile } from "@/topik/components/ui/TopikModeRow";

type Props = {
  srsTotal?: number;
  srsMastered?: number;
};

/** Malhaeboka home favorites — 2-col grid with line icons */
export function StudyModeGrid({ srsTotal, srsMastered }: Props) {
  return (
    <section className="mb-5">
      <p className="topik-section-title mb-3">{vi.home.quickActions}</p>
      <div className="grid grid-cols-2 gap-2.5">
        {HOME_FAVORITE_MODES.map((id) => {
          const mode = getStudyMode(id);
          const extra =
            id === "review" && srsTotal !== undefined
              ? `${srsTotal} thẻ · ${srsMastered} thuộc`
              : undefined;
          return <TopikModeTile key={id} mode={mode} extra={extra} />;
        })}
      </div>
    </section>
  );
}
