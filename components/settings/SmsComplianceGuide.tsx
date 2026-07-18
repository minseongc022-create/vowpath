"use client";

import { useSettingsPage } from "@/components/providers/LocaleProvider";
import { SettingsSectionHeader } from "@/components/settings/SettingsSectionHeader";

export function SmsComplianceGuide() {
  const settingsPage = useSettingsPage();
  const copy = settingsPage.smsCompliance;

  return (
    <section
      id="sms-compliance"
      className="vow-settings-block vow-settings-panel scroll-mt-24 p-3 sm:p-5"
    >
      <SettingsSectionHeader
        icon="📋"
        title={copy.title}
        hint={copy.summary}
        className="mb-4"
      />
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-stone-700">
        {copy.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-stone-600">{copy.note}</p>
      <a
        href={copy.twilioLink}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex text-sm font-medium text-brand-700 underline"
      >
        {copy.twilioLinkLabel}
      </a>
    </section>
  );
}
