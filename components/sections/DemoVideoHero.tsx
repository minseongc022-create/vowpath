"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";

const DEMOS = [
  {
    id: "overview",
    label: "What is Effiroad?",
    mp4: "/videos/demo-overview.mp4",
    webm: "/videos/demo-overview.webm",
    hint: "60-second overview — same number, AI intake, dispatch, you approve exceptions",
  },
  {
    id: "voice",
    label: "AI phone response",
    mp4: "/videos/demo-voice.mp4",
    webm: "/videos/demo-voice.webm",
    hint: "AI speaks on the call · customer replies by text · owner SMS dispatch",
  },
  {
    id: "link-intake",
    label: "Text link intake",
    mp4: "/videos/demo-link-intake.mp4",
    webm: "/videos/demo-link-intake.webm",
    hint: "Press 2 → SMS form · ~1 min self-service · no phone tag",
  },
] as const;

type DemoId = (typeof DEMOS)[number]["id"];

const VISIBLE_RATIO = 0.35;

export function DemoVideoHero() {
  const [active, setActive] = useState<DemoId>("overview");
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const visibleRef = useRef(false);
  const tab = DEMOS.find((t) => t.id === active) ?? DEMOS[0];

  const stopVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.muted = true;
    video.currentTime = 0;
  }, []);

  /** Play unmuted — call from scroll/click handlers (user-gesture context). */
  const playWithSound = useCallback(async (restart = false) => {
    const video = videoRef.current;
    if (!video || !visibleRef.current) return;
    if (restart) video.currentTime = 0;
    video.muted = false;
    video.volume = 1;
    try {
      await video.play();
    } catch {
      video.muted = true;
      try {
        await video.play();
      } catch {
        /* browser blocked */
      }
    }
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const next = entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO;
        const was = visibleRef.current;
        visibleRef.current = next;

        if (!next) {
          stopVideo();
        } else if (!was) {
          /* Entered viewport — play on the next scroll/click gesture, not here. */
        }
      },
      { threshold: [0, VISIBLE_RATIO, 0.55, 0.75] },
    );
    observer.observe(section);

    const onUserGesture = () => {
      if (visibleRef.current) {
        void playWithSound(false);
      } else {
        stopVideo();
      }
    };

    window.addEventListener("scroll", onUserGesture, { passive: true });
    window.addEventListener("wheel", onUserGesture, { passive: true });
    window.addEventListener("touchmove", onUserGesture, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onUserGesture);
      window.removeEventListener("wheel", onUserGesture);
      window.removeEventListener("touchmove", onUserGesture);
      stopVideo();
    };
  }, [playWithSound, stopVideo]);

  const selectTab = (id: DemoId) => {
    setActive(id);
    requestAnimationFrame(() => {
      if (visibleRef.current) void playWithSound(true);
    });
  };

  return (
    <section
      ref={sectionRef}
      id="demo"
      className="border-y border-brand-200/40 bg-[#0c0b0a] py-12 text-white sm:py-16"
    >
      <Container>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b59b78]">See it in action</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">
            3 short demos — what we do &amp; how calls work
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/55 sm:text-base">
            Scroll to this section — video plays with sound. Scroll away and it stops.
          </p>
        </div>

        <div className="-mx-2 mt-8 flex gap-2 overflow-x-auto px-2 pb-1 snap-x snap-mandatory sm:mx-0 sm:justify-center sm:overflow-visible sm:px-0">
          {DEMOS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
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
            loop
            playsInline
            muted
            controls
            preload="metadata"
            aria-label={`Effiroad ${tab.label} demo`}
          >
            <source src={tab.mp4} type="video/mp4" />
            <source src={tab.webm} type="video/webm" />
          </video>
        </div>

        <p className="mt-4 text-center text-xs text-white/45 sm:mt-6">
          {tab.hint}
          {active === "voice" ? (
            <span className="mt-1 block text-[#b59b78]">
              Only the AI speaks — customer replies are text-only.
            </span>
          ) : null}
        </p>
      </Container>
    </section>
  );
}
