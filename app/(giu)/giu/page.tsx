import Link from "next/link";
import { BoxCard } from "@/giu/components/BoxCard";
import { WaitlistForm } from "@/giu/components/WaitlistForm";
import { getGiuStats, listBoxes, listMerchants } from "@/giu/lib/store";
import { formatVnd } from "@/giu/lib/format";
import { GIU_STRINGS } from "@/giu/lib/strings";

export default async function GiuHomePage() {
  const [stats, openBoxes, merchants] = await Promise.all([
    getGiuStats(),
    listBoxes({ openOnly: true }),
    listMerchants(),
  ]);

  const merchantMap = new Map(merchants.map((m) => [m.id, m]));
  const featured = openBoxes.slice(0, 5);

  return (
    <div className="giu-page space-y-6">
      <section className="pt-4">
        <p className="text-sm font-medium text-giu-primary">{GIU_STRINGS.city}</p>
        <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-giu-ink">
          {GIU_STRINGS.heroTitle}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-giu-muted">{GIU_STRINGS.heroSubtitle}</p>
        <p className="mt-2 text-sm font-medium text-giu-accent">{GIU_STRINGS.goldenHour}</p>

        <div className="mt-6 space-y-2">
          <Link href="/giu/hop" className="giu-btn-primary block text-center">
            {GIU_STRINGS.ctaBrowse}
          </Link>
          <Link href="/giu/cua-hang" className="giu-btn-secondary block text-center">
            {GIU_STRINGS.ctaMerchant}
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        {[
          { value: stats.rescuedBoxes.toLocaleString("vi-VN"), label: GIU_STRINGS.statsBoxes },
          { value: formatVnd(stats.savedVnd), label: GIU_STRINGS.statsSaved },
          { value: String(stats.openBoxes), label: "hộp đang mở" },
          { value: `${stats.merchants}+`, label: GIU_STRINGS.statsMerchants },
        ].map((item) => (
          <div key={item.label} className="giu-card-flat ring-1 ring-giu-border">
            <p className="text-lg font-bold text-giu-ink">{item.value}</p>
            <p className="mt-1 text-xs text-giu-muted">{item.label}</p>
          </div>
        ))}
      </section>

      <section className="giu-info-banner">
        <p className="font-semibold">{GIU_STRINGS.trustEscrow}</p>
        <p className="mt-1 text-giu-muted">{GIU_STRINGS.trustEscrowDesc}</p>
      </section>

      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="giu-section-title">Đang mở giải cứu</h2>
            <p className="giu-section-sub">{stats.openBoxes} hộp gần bạn</p>
          </div>
          <Link href="/giu/hop" className="text-sm font-semibold text-giu-primary">
            Xem tất cả →
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="mt-4 space-y-3">
            {featured.map((box) => {
              const merchant = merchantMap.get(box.merchantId);
              if (!merchant) return null;
              return <BoxCard key={box.id} box={box} merchant={merchant} />;
            })}
          </div>
        ) : (
          <div className="giu-card mt-4 space-y-4 text-center">
            <p className="font-semibold text-giu-ink">{GIU_STRINGS.emptyBoxes}</p>
            <p className="text-sm text-giu-muted">{GIU_STRINGS.emptyBoxesHint}</p>
            <WaitlistForm />
          </div>
        )}
      </section>

      <section className="giu-card space-y-4">
        <h2 className="giu-section-title">{GIU_STRINGS.howItWorks}</h2>
        {[
          { n: "1", title: GIU_STRINGS.step1Title, desc: GIU_STRINGS.step1Desc },
          { n: "2", title: GIU_STRINGS.step2Title, desc: GIU_STRINGS.step2Desc },
          { n: "3", title: GIU_STRINGS.step3Title, desc: GIU_STRINGS.step3Desc },
        ].map((step, i) => (
          <div key={step.n}>
            {i > 0 ? <div className="giu-divider mb-4" /> : null}
            <div className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-giu-primary-soft text-sm font-bold text-giu-primary">
                {step.n}
              </span>
              <div>
                <h3 className="font-semibold text-giu-ink">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-giu-muted">{step.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
