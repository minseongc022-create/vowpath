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

export function DemoVideoHero() {
  const [active, setActive] = useState<DemoId>("overview");
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const visibleRef = useRef(false);
  const tab = DEMOS.find((t) => t.id === active) ?? DEMOS[0];

  const playWithSound = useCallback(async (restart = false) => {
    const video = videoRef.current;
    if (!video || !visibleRef.current) return;
    if (restart) video.currentTime = 0;
    video.muted = false;
    video.volume = 1;
    try {
      await video.play();
      return;
    } catch {
      /* fall through */
    }
    try {
      video.muted = true;
      await video.play();
      video.muted = false;
      await video.play();
    } catch {
      /* browser blocked autoplay */
    }
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const onVisibleChange = (next: boolean) => {
      visibleRef.current = next;
      setIsVisible(next);
      const video = videoRef.current;
      if (!video) return;
      if (next) {
        void playWithSound(true);
      } else {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        onVisibleChange(entry.isIntersecting && entry.intersectionRatio >= 0.3);
      },
      { threshold: [0, 0.3, 0.5, 0.7] },
    );
    observer.observe(section);

    const onScroll = () => {
      if (visibleRef.current) void playWithSound(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onScroll);
      window.removeEventListener("touchmove", onScroll);
    };
  }, [playWithSound]);

  useEffect(() => {
    if (isVisible) void playWithSound(true);
  }, [active, isVisible, playWithSound]);

  const selectTab = (id: DemoId) => {
    setActive(id);
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
            Scroll here — videos play automatically with narration.
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
            controls
            preload="auto"
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
              Only the AI speaks on this demo — customer replies appear as text.
            </span>
          ) : null}
        </p>
      </Container>
    </section>
  );
}
