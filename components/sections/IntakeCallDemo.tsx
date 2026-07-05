"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Role = "caller" | "ai" | "system" | "sms";

type Step = {
  role: Role;
  text: string;
  /** ms to wait BEFORE showing this bubble */
  delay: number;
};

const RESTORATION_SCRIPT: Step[] = [
  { role: "system", text: "Incoming call — 2:14 AM", delay: 400 },
  {
    role: "ai",
    text: "Thank you for calling Ridgeline Restoration. This call is being recorded to capture your emergency details. Are you experiencing water damage, fire or smoke damage, or mold?",
    delay: 1000,
  },
  {
    role: "caller",
    text: "Water — there's water flooding my basement right now. It's coming up through the floor drain.",
    delay: 2400,
  },
  {
    role: "ai",
    text: "I understand — we'll get help to you right away. Can I get your name and the service address?",
    delay: 1600,
  },
  { role: "caller", text: "Mike Wilson, 4821 Oak Drive, Austin Texas.", delay: 2000 },
  { role: "ai", text: "Got it, Mike. How long has the water been rising?", delay: 1400 },
  {
    role: "caller",
    text: "About two hours. It's already six inches in some spots.",
    delay: 2000,
  },
  {
    role: "ai",
    text: "This looks like a sewage backup — I'm flagging this as Priority 1. I'm alerting the on-call tech right now. What's the best callback number?",
    delay: 1800,
  },
  { role: "caller", text: "512-555-0192. Please hurry.", delay: 1800 },
  {
    role: "sms",
    text: "NEW JOB · Mike Wilson · 4821 Oak Dr, Austin TX · Sewage backup, ~2 hrs, 6\" standing water · P1 URGENT · Reply 1 to dispatch, 2 to decline",
    delay: 1200,
  },
  { role: "system", text: "Owner replied: 1 — Dispatching", delay: 2200 },
  {
    role: "ai",
    text: "Good news, Mike — a technician is on the way. You'll get a text with their ETA in a few minutes. Stay out of the water if possible and cut power to the basement if it's safe to do so.",
    delay: 1600,
  },
  { role: "caller", text: "Thank you so much!", delay: 1800 },
  {
    role: "system",
    text: "Technician arrived on-site · Intake saved · Crew dispatched · Job created in 4 min 22 sec",
    delay: 800,
  },
];

const HVAC_SCRIPT: Step[] = [
  { role: "system", text: "Incoming call — 6:40 AM", delay: 400 },
  {
    role: "ai",
    text: "Thanks for calling Comfort Air HVAC. This call is being recorded to capture your service details. What's going on with your system today?",
    delay: 1000,
  },
  {
    role: "caller",
    text: "Our heat completely died overnight and it's freezing in here — we have two kids.",
    delay: 2400,
  },
  {
    role: "ai",
    text: "I'm sorry, we'll get someone out to you right away. Can I get your name and the service address?",
    delay: 1600,
  },
  { role: "caller", text: "Sarah Bennett, 118 Birchwood Lane, Denver Colorado.", delay: 2000 },
  { role: "ai", text: "Got it, Sarah. Any smell of gas, or is it just no heat?", delay: 1400 },
  {
    role: "caller",
    text: "No gas smell, just completely dead — it was blowing cold air then shut off.",
    delay: 2000,
  },
  {
    role: "ai",
    text: "Got it — a clear no-heat call, so I'm flagging this Priority 1 and dispatching your on-call tech now. What's the best callback number?",
    delay: 1800,
  },
  { role: "caller", text: "303-555-0148. Thank you so much.", delay: 1800 },
  {
    role: "sms",
    text: "NEW JOB · Sarah Bennett · 118 Birchwood Ln, Denver CO · No heat, system dead overnight · P1 AUTO-DISPATCHED",
    delay: 1200,
  },
  { role: "system", text: "Crew auto-dispatched — no owner approval needed", delay: 2200 },
  {
    role: "ai",
    text: "Good news, Sarah — a technician is on the way. You'll get a text with their ETA shortly. In the meantime, keep the thermostat set to heat so the system's ready to kick on.",
    delay: 1600,
  },
  { role: "caller", text: "Thank you, that's a relief!", delay: 1800 },
  {
    role: "system",
    text: "Technician arrived on-site · Intake saved · Crew dispatched · Job created in 3 min 40 sec",
    delay: 800,
  },
];

const TYPING_DURATION_MS = 900;

function CallerIcon() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
      M
    </span>
  );
}

function AiIcon() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
      AI
    </span>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

function Bubble({ step, typing }: { step: Step; typing?: boolean }) {
  if (step.role === "system") {
    return (
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          {typing ? (
            <TypingDots />
          ) : (
            <>
              <svg className="h-3 w-3 text-slate-400" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9-3a1 1 0 11-2 0 1 1 0 012 0zM6.75 10.75a.75.75 0 001.5 0V8a.75.75 0 00-1.5 0v2.75z" clipRule="evenodd" />
              </svg>
              {step.text}
            </>
          )}
        </span>
      </div>
    );
  }

  if (step.role === "sms") {
    return (
      <div className="flex items-start gap-2 pl-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
          SMS
        </span>
        <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-emerald-200 bg-emerald-50 px-3 py-2 shadow-sm">
          {typing ? (
            <TypingDots />
          ) : (
            <p className="text-xs font-medium leading-relaxed text-emerald-900">{step.text}</p>
          )}
        </div>
      </div>
    );
  }

  if (step.role === "caller") {
    return (
      <div className="flex items-start justify-end gap-2 pr-2">
        <div className="max-w-[82%] rounded-2xl rounded-tr-none bg-slate-700 px-3 py-2 shadow-sm">
          {typing ? (
            <TypingDots />
          ) : (
            <p className="text-xs leading-relaxed text-white">{step.text}</p>
          )}
        </div>
        <CallerIcon />
      </div>
    );
  }

  // ai
  return (
    <div className="flex items-start gap-2 pl-2">
      <AiIcon />
      <div className="max-w-[82%] rounded-2xl rounded-tl-none bg-brand-50 px-3 py-2 shadow-sm ring-1 ring-brand-200">
        {typing ? (
          <TypingDots />
        ) : (
          <p className="text-xs leading-relaxed text-brand-900">{step.text}</p>
        )}
      </div>
    </div>
  );
}

const DEMO_COPY = {
  restoration: {
    heading: "A real 2 AM emergency intake — start to dispatch",
    subhead:
      "Watch Effiroad answer a sewage backup call, capture insurance-ready intake, alert the owner, and dispatch a crew — all while the homeowner is still on the line.",
    statusTime: "2:14 AM",
  },
  hvac: {
    heading: "A real 6 AM no-heat call — start to dispatch",
    subhead:
      "Watch Effiroad answer a no-heat emergency, capture the job details, and auto-dispatch the on-call tech — all while the customer is still on the line.",
    statusTime: "6:40 AM",
  },
} as const;

export function IntakeCallDemo({
  vertical = "restoration",
}: {
  vertical?: "restoration" | "hvac";
}) {
  const script = vertical === "hvac" ? HVAC_SCRIPT : RESTORATION_SCRIPT;
  const copy = DEMO_COPY[vertical];
  const [visible, setVisible] = useState<number[]>([]);
  const [typing, setTyping] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = useCallback(() => {
    for (const t of timeouts.current) clearTimeout(t);
    timeouts.current = [];
  }, []);

  const play = useCallback(() => {
    clearAll();
    setVisible([]);
    setTyping(null);
    setDone(false);

    let cursor = 600;
    script.forEach((step, idx) => {
      cursor += step.delay;
      const showTypingAt = cursor;
      const showBubbleAt = cursor + TYPING_DURATION_MS;

      timeouts.current.push(
        setTimeout(() => setTyping(idx), showTypingAt),
        setTimeout(() => {
          setTyping((prev) => (prev === idx ? null : prev));
          setVisible((prev) => [...prev, idx]);
          if (idx === script.length - 1) setDone(true);
        }, showBubbleAt),
      );

      cursor = showBubbleAt;
    });
  }, [clearAll, script]);

  // Auto-play on mount
  useEffect(() => {
    play();
    return clearAll;
  }, [play, clearAll]);

  // Auto-scroll to bottom as bubbles appear
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible, typing]);

  return (
    <section id="intake-demo" className="vow-site-section border-y border-brand-200/60 bg-gradient-to-b from-brand-50/60 to-white py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center">
          <p className="mb-2 inline-flex rounded-full border border-brand-300/50 bg-brand-100 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-brand-800">
            Live demo
          </p>
          <h2 className="text-2xl font-bold text-brand-950 sm:text-3xl">
            {copy.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-stone-600">
            {copy.subhead}
          </p>
        </div>

        {/* Phone frame */}
        <div className="mx-auto mt-10 max-w-md">
          <div className="overflow-hidden rounded-3xl border-4 border-slate-800 bg-slate-800 shadow-2xl shadow-slate-900/30">
            {/* Status bar */}
            <div className="flex items-center justify-between bg-slate-900 px-4 py-2 text-xs text-slate-400">
              <span>{copy.statusTime}</span>
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3 text-emerald-400" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                  <circle cx="6" cy="6" r="5" />
                </svg>
                Effiroad AI
              </span>
              <span>100%</span>
            </div>

            {/* Chat area */}
            <div
              ref={scrollRef}
              className="flex h-[420px] flex-col gap-3 overflow-y-auto bg-white px-3 py-4 sm:h-[460px]"
              aria-live="polite"
            >
              {/* Render confirmed bubbles */}
              {script.map((step, idx) => {
                if (!visible.includes(idx)) return null;
                return <Bubble key={idx} step={step} />;
              })}

              {/* Typing indicator for next bubble */}
              {typing !== null && !visible.includes(typing) && (
                <Bubble key={`typing-${typing}`} step={script[typing]} typing />
              )}
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
              <span className="text-xs text-slate-400">Recording · Intake capturing</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500">
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M6.62 10.79a15.91 15.91 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21 11.36 11.36 0 003.54.56 1 1 0 011 1v3.5a1 1 0 01-1 1A17 17 0 013 5a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.56 3.54 1 1 0 01-.25 1.06z" />
                </svg>
              </span>
            </div>
          </div>

          {/* Replay button */}
          <div className="mt-6 flex items-center justify-center gap-4">
            {done ? (
              <button
                onClick={play}
                className="inline-flex items-center gap-2 rounded-xl border border-brand-300 bg-brand-50 px-5 py-2 text-sm font-semibold text-brand-800 shadow-sm transition hover:bg-brand-100"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H5.498a.75.75 0 00-.75.75v3.498a.75.75 0 001.5 0v-1.632l.312.311a7 7 0 1011.712-3.138.75.75 0 10-1.047 1.074 5.5 5.5 0 01-1.913 4.641z" clipRule="evenodd" />
                </svg>
                Replay demo
              </button>
            ) : (
              <span className="flex items-center gap-2 text-sm text-stone-500">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-brand-500" aria-hidden />
                Playing…
              </span>
            )}
            <a
              href="/get-started"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
            >
              Get this for your shop →
            </a>
          </div>
        </div>

        {/* Stats row */}
        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-4 rounded-2xl border border-brand-200 bg-brand-50 px-6 py-5 text-center">
          <div>
            <p className="text-xl font-bold text-brand-900">4 min</p>
            <p className="mt-0.5 text-xs text-stone-500">Intake to dispatch</p>
          </div>
          <div className="border-x border-brand-200">
            <p className="text-xl font-bold text-brand-900">$0</p>
            <p className="mt-0.5 text-xs text-stone-500">Missed jobs at 2 AM</p>
          </div>
          <div>
            <p className="text-xl font-bold text-brand-900">24/7</p>
            <p className="mt-0.5 text-xs text-stone-500">Always answering</p>
          </div>
        </div>
      </div>
    </section>
  );
}
