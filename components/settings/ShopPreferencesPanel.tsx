"use client";

import { AgreementKeeperSettingsEditor } from "@/components/settings/AgreementKeeperSettings";
import { BookingSettingsEditor } from "@/components/settings/BookingSettingsEditor";
import { ShopNameEditor } from "@/components/settings/ShopNameEditor";
import { SmsComplianceGuide } from "@/components/settings/SmsComplianceGuide";
import { TechDispatchSettings } from "@/components/settings/TechDispatchSettings";
import { useSettingsPage } from "@/components/providers/LocaleProvider";
import type { ReactNode } from "react";

type ShopPreferencesPanelProps = {
  verticalSelector: ReactNode;
  zapierEditor: ReactNode;
  widgetCard: ReactNode;
  reviewUrlEditor: ReactNode;
};

export function ShopPreferencesPanel({
  verticalSelector,
  zapierEditor,
  widgetCard,
  reviewUrlEditor,
}: ShopPreferencesPanelProps) {
  const copy = useSettingsPage();

  return (
    <div className="space-y-3 sm:space-y-4">
      <p className="vow-settings-guide-banner px-2.5 py-2 text-sm leading-snug sm:px-3 sm:py-2.5">
        {copy.productSectionSubtitle}
      </p>

      <ShopNameEditor />

      {verticalSelector}

      <BookingSettingsEditor />

      <TechDispatchSettings />

      <AgreementKeeperSettingsEditor />

      <SmsComplianceGuide />

      {zapierEditor}

      {widgetCard}

      {reviewUrlEditor}
    </div>
  );
}
