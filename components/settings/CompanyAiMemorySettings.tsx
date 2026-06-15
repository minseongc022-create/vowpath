"use client";

import { useEffect, useState } from "react";
import type { CompanyAiMemory } from "@/lib/company-ai-memory";

type FormState = Omit<CompanyAiMemory, "userId" | "updatedAt">;

const EMPTY: FormState = {
  serviceAreas: "",
  businessHours: "",
  holidayRules: "",
  emergencyPolicy: "",
  approvalPolicy: "",
  specialInstructions: "",
  dailyBriefingSmsEnabled: false,
  dailyBriefingSmsTime: "08:00",
};

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

export function CompanyAiMemorySettings() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/company-ai-memory")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { memory?: CompanyAiMemory } | null) => {
        if (cancelled) return;
        if (data?.memory) {
          const { userId: _userId, updatedAt: _updatedAt, ...memory } = data.memory;
          setForm(memory);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function patch(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
    setMessage(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/company-ai-memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("save failed");
      setMessage("AI memory saved.");
    } catch {
      setMessage("Could not save AI memory. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Company AI Memory
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          Teach Vowpath how your shop operates
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Vowpath AI and daily briefings use these rules as company policy. Answers
          still come only from saved data.
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        <Field
          label="Service Areas"
          value={form.serviceAreas}
          onChange={(value) => patch({ serviceAreas: value })}
          placeholder="Austin, Round Rock, Pflugerville. No commercial jobs outside Travis County."
        />
        <Field
          label="Business Hours"
          value={form.businessHours}
          onChange={(value) => patch({ businessHours: value })}
          placeholder="Mon-Fri 8AM-5PM. Saturday emergency only."
        />
        <Field
          label="Holiday Rules"
          value={form.holidayRules}
          onChange={(value) => patch({ holidayRules: value })}
          placeholder="Closed Thanksgiving and Christmas. Emergency calls only."
        />
        <Field
          label="Emergency Policy"
          value={form.emergencyPolicy}
          onChange={(value) => patch({ emergencyPolicy: value })}
          placeholder="No Cooling over 90°F, No Heat under 40°F, Gas Smell, Water Leak = urgent."
        />
        <Field
          label="Approval Policy"
          value={form.approvalPolicy}
          onChange={(value) => patch({ approvalPolicy: value })}
          placeholder="Auto-book tune-ups. Require owner approval for P1 and low-confidence intake."
        />
        <Field
          label="Special Instructions"
          value={form.specialInstructions}
          onChange={(value) => patch({ specialInstructions: value })}
          placeholder="Mention diagnostic fee. Do not schedule warranty calls after hours."
        />
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.dailyBriefingSmsEnabled}
            onChange={(e) => patch({ dailyBriefingSmsEnabled: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900">
              Send Daily Briefing SMS
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-600">
              Sends calls, requests, approvals, pending, urgent requests, and most
              common issue. No revenue estimates.
            </span>
          </span>
        </label>
        <label className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Preferred time
          </span>
          <input
            type="time"
            value={form.dailyBriefingSmsTime}
            onChange={(e) => patch({ dailyBriefingSmsTime: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>
      </div>

      {message ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        disabled={loading || saving}
        onClick={save}
        className="hvac-btn-primary mt-5 w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save AI Memory"}
      </button>
    </section>
  );
}
