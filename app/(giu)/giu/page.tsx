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
  const featured = openBoxes.slice(0, 6);

  return (
    <>
      <section className="relative overflow-hidden border-b border-giu-border bg-gradient-to-br from-giu-primary/15 via-white to-giu-gold/10">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-wide text-giu-primary">
            {GIU_STRINGS.city}
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-giu-ink sm:text-5xl">
            {GIU_STRINGS.heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-giu-muted">{GIU_STRINGS.heroSubtitle}</p>
          <p className="mt-2 text-sm font-medium text-giu-accent">{GIU_STRINGS.goldenHour}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/giu/hop"
              className="rounded-xl bg-giu-accent px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-giu-accent-hover"
            >
              {GIU_STRINGS.ctaBrowse}
            </Link>
            <Link
              href="/giu/cua-hang"
              className="rounded-xl border border-giu-border bg-white px-6 py-3 text-sm font-semibold text-giu-ink hover:bg-giu-surface"
            >
              {GIU_STRINGS.ctaMerchant}
            </Link>
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:max-w-2xl">
            <div>
              <dt className="text-2xl font-bold text-giu-ink">
                {stats.rescuedBoxes.toLocaleString("vi-VN")}
              </dt>
              <dd className="text-xs text-giu-muted">{GIU_STRINGS.statsBoxes}</dd>
            </div>
            <div>
              <dt className="text-2xl font-bold text-giu-ink">
                {Math.round(stats.co2Kg).toLocaleString("vi-VN")}
              </dt>
              <dd className="text-xs text-giu-muted">{GIU_STRINGS.statsCo2}</dd>
            </div>
            <div>
              <dt className="text-2xl font-bold text-giu-ink">{formatVnd(stats.savedVnd)}</dt>
              <dd className="text-xs text-giu-muted">{GIU_STRINGS.statsSaved}</dd>
            </div>
            <div>
              <dt className="text-2xl font-bold text-giu-ink">{stats.merchants}+</dt>
              <dd className="text-xs text-giu-muted">{GIU_STRINGS.statsMerchants}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-giu-ink">Đang mở giải cứu</h2>
            <p className="mt-1 text-sm text-giu-muted">{stats.openBoxes} hộp đang chờ bạn</p>
          </div>
          <Link href="/giu/hop" className="text-sm font-semibold text-giu-primary">
            Xem tất cả →
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((box) => {
              const merchant = merchantMap.get(box.merchantId);
              if (!merchant) return null;
              return <BoxCard key={box.id} box={box} merchant={merchant} />;
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-giu-border bg-giu-surface p-8 text-center">
            <p className="font-medium text-giu-ink">{GIU_STRINGS.emptyBoxes}</p>
            <p className="mt-2 text-sm text-giu-muted">{GIU_STRINGS.emptyBoxesHint}</p>
            <div className="mx-auto mt-6 max-w-md">
              <WaitlistForm />
            </div>
          </div>
        )}
      </section>

      <section className="bg-giu-surface py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold text-giu-ink">{GIU_STRINGS.howItWorks}</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { n: "1", title: GIU_STRINGS.step1Title, desc: GIU_STRINGS.step1Desc },
              { n: "2", title: GIU_STRINGS.step2Title, desc: GIU_STRINGS.step2Desc },
              { n: "3", title: GIU_STRINGS.step3Title, desc: GIU_STRINGS.step3Desc },
            ].map((step) => (
              <li
                key={step.n}
                className="rounded-2xl border border-giu-border bg-white p-6 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-giu-primary text-sm font-bold text-white">
                  {step.n}
                </span>
                <h3 className="mt-4 font-semibold text-giu-ink">{step.title}</h3>
                <p className="mt-2 text-sm text-giu-muted">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-giu-border bg-giu-primary py-14 text-white">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-2xl font-bold">{GIU_STRINGS.trustTitle}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { title: GIU_STRINGS.trustSave, desc: GIU_STRINGS.trustSaveDesc },
              { title: GIU_STRINGS.trustLocal, desc: GIU_STRINGS.trustLocalDesc },
              { title: GIU_STRINGS.trustFree, desc: GIU_STRINGS.trustFreeDesc },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-white/85">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
