"use client";

import Link from "next/link";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { t } from "@/giu/lib/i18n";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";
import { MerchantValuePitch } from "./MerchantValuePitch";

export function MerchantLandingClient() {
  const { locale } = useGiuLocale();
  const href = useGiuHref();
  const authBase = href(GIU_ROUTES.auth);

  return (
    <div className="giu-page space-y-4">
      <div>
        <h1 className="text-[22px] font-extrabold text-giu-ink">{t(locale, "mLandingHero")}</h1>
        <p className="mt-1 text-[13px] text-giu-muted">{t(locale, "mLandingHeroSub")}</p>
      </div>

      <MerchantValuePitch locale={locale} variant="landing" />

      <div className="space-y-2">
        <Link
          href={`${authBase}?role=merchant&mode=signup`}
          className="giu-btn-primary giu-btn-3d block py-3.5 text-center text-[15px]"
        >
          {t(locale, "mLandingSignupCta")}
        </Link>
        <Link
          href={`${authBase}?role=merchant`}
          className="giu-btn-secondary giu-btn-3d block py-3 text-center text-[14px]"
        >
          {t(locale, "mLandingLoginCta")}
        </Link>
      </div>

      <p className="text-center text-[12px] text-giu-muted">
        {t(locale, "mLandingRegionHint")}
      </p>
    </div>
  );
}
