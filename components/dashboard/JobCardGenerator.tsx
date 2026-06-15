"use client";

import { useEffect, useState } from "react";
import { jobCardGenerator, jobberConnect } from "@/lib/content";
import type { GeneratedJobCard } from "@/lib/job-card-ai";
import { formatPriority } from "@/lib/priority-labels";
import { initialRequestStatusAfterIntake } from "@/lib/booking-policy";
import { addJob } from "@/lib/shop-storage";
import { persistJob } from "@/lib/dashboard-data-client";

type JobCardGeneratorProps = {
  onSaved: () => void;
};

function priorityClass(p: GeneratedJobCard["priority"]) {
  if (p === "P1") return "text-red-700 bg-red-50 border-red-100";
  if (p === "P2") return "text-amber-800 bg-amber-50 border-amber-100";
  return "text-slate-700 bg-slate-50 border-slate-200";
}

export function JobCardGenerator({ onSaved }: JobCardGeneratorProps) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<GeneratedJobCard | null>(null);
  const [copied, setCopied] = useState(false);
  const [jobberConnected, setJobberConnected] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/jobber/status")
      .then((r) => r.json())
      .then((d: { connected?: boolean }) => setJobberConnected(Boolean(d.connected)))
      .catch(() => setJobberConnected(false));
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const res = await fetch("/api/job-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = (await res.json()) as {
        card?: GeneratedJobCard;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? jobCardGenerator.errorGeneric);
        setCard(null);
        return;
      }

      setCard(data.card ?? null);
    } catch {
      setError(jobCardGenerator.errorGeneric);
      setCard(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!card) return;
    await navigator.clipboard.writeText(card.jobberPasteBlock);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave(jobberJobId?: string) {
    if (!card) return;
    const local = addJob({
      priority: card.priority,
      symptom: card.symptom,
      customerName: card.customerName,
      address: card.address,
      arrivalWindow: card.arrivalWindow,
      status: initialRequestStatusAfterIntake(),
      jobberJobId,
    });
    await persistJob(local);
    onSaved();
    setCard(null);
    setNotes("");
    setPushSuccess(null);
  }

  async function handlePushJobber() {
    if (!card) return;
    setPushing(true);
    setError(null);
    setPushSuccess(null);
    try {
      const res = await fetch("/api/jobber/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        result?: { requestId: string; jobberWebUri?: string };
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? jobCardGenerator.pushJobberFailed);
        return;
      }
      const requestId = data.result?.requestId;
      const uri = data.result?.jobberWebUri;
      if (requestId) {
        const local = addJob({
          priority: card.priority,
          symptom: card.symptom,
          customerName: card.customerName,
          address: card.address,
          arrivalWindow: card.arrivalWindow,
          status: initialRequestStatusAfterIntake(),
          jobberJobId: requestId,
        });
        await persistJob(local);
        onSaved();
      }
      setPushSuccess(uri ?? jobCardGenerator.pushedJobber);
      setCard(null);
      setNotes("");
    } catch {
      setError(jobCardGenerator.pushJobberFailed);
    } finally {
      setPushing(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-900/10 bg-white p-6 shadow-card ring-1 ring-slate-900/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-600">{jobCardGenerator.eyebrow}</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            {jobCardGenerator.title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{jobCardGenerator.subtitle}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {jobCardGenerator.badge}
        </span>
      </div>

      <label className="mt-6 block">
        <span className="text-sm font-medium text-slate-700">
          {jobCardGenerator.notesLabel}
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          placeholder={jobCardGenerator.notesPlaceholder}
          className="mt-2 w-full resize-y rounded-lg border border-surface-border px-4 py-3 text-sm text-slate-900 shadow-sm outline-none ring-brand-500 placeholder:text-slate-400 focus:ring-2"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || notes.trim().length < 10}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? jobCardGenerator.generating : jobCardGenerator.generate}
        </button>
      </div>

      {pushSuccess ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {pushSuccess.startsWith("http") ? (
            <>
              {jobCardGenerator.pushedJobber}{" "}
              <a
                href={pushSuccess}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                {jobberConnect.openJobber}
              </a>
            </>
          ) : (
            pushSuccess
          )}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {card ? (
        <div className="mt-6 space-y-4 rounded-xl border border-surface-border bg-surface-muted p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${priorityClass(card.priority)}`}
            >
              {formatPriority(card.priority)} · {card.symptom}
            </span>
            <span className="text-xs text-slate-500">{jobCardGenerator.resultLabel}</span>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500">{jobCardGenerator.fields.customer}</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{card.customerName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">{jobCardGenerator.fields.phone}</dt>
              <dd className="mt-0.5 text-slate-900">{card.phone}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-500">{jobCardGenerator.fields.address}</dt>
              <dd className="mt-0.5 text-slate-900">{card.address}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-500">{jobCardGenerator.fields.window}</dt>
              <dd className="mt-0.5 text-slate-900">{card.arrivalWindow}</dd>
            </div>
          </dl>

          <div>
            <p className="text-xs font-medium text-slate-500">{jobCardGenerator.fields.dispatch}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {card.dispatchNotes}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">{jobCardGenerator.fields.jobber}</p>
            <pre className="mt-1 overflow-x-auto rounded-lg border border-surface-border bg-white p-4 text-xs leading-relaxed text-slate-800">
              {card.jobberPasteBlock}
            </pre>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-surface-border bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              {copied ? jobCardGenerator.copied : jobCardGenerator.copy}
            </button>
            {jobberConnected ? (
              <button
                type="button"
                onClick={handlePushJobber}
                disabled={pushing}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {pushing ? jobCardGenerator.pushingJobber : jobCardGenerator.pushJobber}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => handleSave()}
              className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100"
            >
              {jobCardGenerator.save}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
