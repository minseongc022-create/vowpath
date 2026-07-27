"use client";

import { BookingSettingsEditor } from "@/components/settings/BookingSettingsEditor";
import { ShopNameEditor } from "@/components/settings/ShopNameEditor";
import { EstimateDefaultsPanel } from "@/components/settings/EstimateDefaultsPanel";
import { ShopOptionalFollowUps } from "@/components/settings/ShopOptionalFollowUps";
import { TechDispatchSettings } from "@/components/settings/TechDispatchSettings";
import { useSettingsPage } from "@/components/providers/LocaleProvider";
import type { ShopVertical } from "@/lib/shop-vertical";
import type { ReactNode } from "react";

type ShopPreferencesPanelProps = {
  vertical: ShopVertical;
  verticalSelector: ReactNode;
  reviewUrl?: string;
  onReviewUrlSaved: (url: string | undefined) => void;
};

export function ShopPreferencesPanel({
  vertical,
  verticalSelector,
  reviewUrl,
  onReviewUrlSaved,
}: ShopPreferencesPanelProps) {
  const copy = useSettingsPage();

  return (
    <div className="space-y-3 sm:space-y-4">
      <p className="vow-settings-guide-banner px-2.5 py-2 text-sm leading-snug sm:px-3 sm:py-2.5">
        {copy.productSectionSubtitle}
      </p>

      {/* Trade first — booking rules and intake options depend on it. */}
      <div className="vow-settings-block vow-settings-panel p-3 sm:p-5">{verticalSelector}</div>

      <ShopNameEditor />

      <BookingSettingsEditor vertical={vertical} />

      <TechDispatchSettings />

      <EstimateDefaultsPanel />

      <ShopOptionalFollowUps reviewUrl={reviewUrl} onReviewUrlSaved={onReviewUrlSaved} />
    </div>
  );
}
