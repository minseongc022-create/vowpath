"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";

const DEMOS = [
  {
    id: "overview",
    label: "What is Effiroad?",
    webm: "/videos/demo-overview.webm",
    mp4: "/videos/demo-overview.mp4",
    hasAudio: false,
    hint: "60-second overview — same number, AI intake, dispatch, you approve exceptions",
  },
  {
    id: "voice",
    label: "AI phone response",
    webm: "/videos/demo-voice.webm",
    mp4: "/videos/demo-voice.mp4",
    hasAudio: true,
    hint: "AI speaks on the call · customer replies by text · owner SMS dispatch",
  },
  {
    id: "link-intake",
    label: "Text link intake",
    webm: "/videos/demo-link-intake.webm",
    mp4: "/videos/demo-link-intake.mp4",
    hasAudio: false,
    hint: "Press 2 → SMS form · ~1 min self-service · no phone tag",
  },
] as const;

type DemoId = (typeof DEMOS)[number]["id"];

export function DemoVideoHero() {
  const [active, setActive] = useState<DemoId>("overview");
  const [soundOn, setSoundOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const tab = DEMOS.find((t) => t.id === active) ?? DEMOS[0];

  const enableSound = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    void video.play().catch(() => {});
    setSoundOn(true);
  }, []);

  const toggleSound = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.muted) {
      enableSound();
    } else {
      video.muted = true;
      setSoundOn(false);
    }
  }, [enableSound]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    setSoundOn(false);
    void video.play().catch(() => {});
  }, [tab.id]);

  return (
    <section id="demo" className="border-y border-brand-200/40 bg-[#0c0b0a] py-12 text-white sm:py-16">
      <Container>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b59b78]">See it in action</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">
            3 short demos — what we do &amp; how calls work
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/55 sm:text-base">
            Overview first, then how Effiroad responds on a real emergency call.
          </p>
        </div>

        <div className="-mx-2 mt-8 flex gap-2 overflow-x-auto px-2 pb-1 snap-x snap-mandatory sm:mx-0 sm:justify-center sm:overflow-visible sm:px-0">
          {DEMOS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`min-h-[48px] shrink-0 snap-center rounded-full px-5 py-2.5 text-sm font-semibold transition sm:shrink ${
                active === t.id
                  ? "bg-[#9a7f5e] text-white shadow-lg shadow-[#9a7f5e]/30"
                  : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative mx-auto mt-6 max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl sm:mt-8">
          <video
            ref={videoRef}
            key={tab.id}
            className="aspect-video w-full bg-black object-contain"
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="auto"
            aria-label={`Effiroad ${tab.label} demo`}
          >
            {tab.hasAudio ? (
              <>
                <source src={tab.mp4} type="video/mp4" />
                <source src={tab.webm} type="video/webm" />
              </>
            ) : (
              <>
                <source src={tab.webm} type="video/webm" />
                <source src={tab.mp4} type="video/mp4" />
              </>
            )}
          </video>

          {tab.hasAudio && !soundOn ? (
            <button
              type="button"
              onClick={enableSound}
              className="absolute bottom-14 right-3 z-10 flex items-center gap-2 rounded-full bg-[#9a7f5e] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/40 transition hover:bg-[#b59b78] sm:bottom-16 sm:right-4"
              aria-label="Turn on sound for AI voice demo"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
              Hear AI voice
            </button>
          ) : null}

          {tab.hasAudio ? (
            <button
              type="button"
              onClick={toggleSound}
              className="absolute bottom-14 left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/20 transition hover:bg-black/90 sm:bottom-16 sm:left-4"
              aria-label={soundOn ? "Mute demo audio" : "Unmute demo audio"}
              title={soundOn ? "Mute" : "Unmute"}
            >
              {soundOn ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              )}
            </button>
          ) : null}
        </div>

        <p className="mt-4 text-center text-xs text-white/45 sm:mt-6">
          {tab.hint}
          {active === "voice" ? (
            <span className="mt-1 block text-[#b59b78]">
              Tap &ldquo;Hear AI voice&rdquo; — only the AI speaks; customer replies appear as text.
            </span>
          ) : null}
        </p>
      </Container>
    </section>
  );
}
