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
      <p className="rounded-xl border border-brand-200 bg-brand-50/70 px-3 py-2.5 text-sm leading-snug text-brand-950">
        {copy.productSectionSubtitle}
      </p>

      <div className="vow-settings-section">
        <ShopNameEditor />
      </div>

      <div className="vow-settings-section">{verticalSelector}</div>

      <div className="vow-settings-section">
        <BookingSettingsEditor />
      </div>

      <div className="vow-settings-section">
        <TechDispatchSettings />
      </div>

      <div className="vow-settings-section">
        <AgreementKeeperSettingsEditor />
      </div>

      <div className="vow-settings-section">
        <SmsComplianceGuide />
      </div>

      <div className="vow-settings-section">{zapierEditor}</div>

      <div className="vow-settings-section">{widgetCard}</div>

      <div className="vow-settings-section">{reviewUrlEditor}</div>
    </div>
  );
}
