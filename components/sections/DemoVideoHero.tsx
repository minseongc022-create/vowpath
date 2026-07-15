"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import {
  DEMO_VERTICAL_CONFIG,
  type DemoTab,
  type DemoVertical,
} from "@/lib/demo-vertical-config";

const VISIBLE_RATIO = 0.35;
const CACHE_V = "7";

type DemoVideoHeroProps = {
  vertical?: DemoVertical;
};

export function DemoVideoHero({ vertical = "restoration" }: DemoVideoHeroProps) {
  const config = DEMO_VERTICAL_CONFIG[vertical];
  const demos = config.tabs;
  const [active, setActive] = useState(demos[0].id);
  const [isMuted, setIsMuted] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const visibleRef = useRef(false);
  const tab = demos.find((t) => t.id === active) ?? demos[0];

  const syncMuted = useCallback(() => {
    const video = videoRef.current;
    if (video) setIsMuted(video.muted);
  }, []);

  const stopVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.muted = true;
    video.currentTime = 0;
    setIsMuted(true);
  }, []);

  const enableSound = useCallback(async (restart = false) => {
    const video = videoRef.current;
    if (!video) return;
    if (restart) video.currentTime = 0;
    video.muted = false;
    video.volume = 1;
    setIsMuted(false);
    try {
      await video.play();
    } catch {
      /* ignore */
    }
  }, []);

  const playVisible = useCallback(
    async (withSound: boolean, restart = false) => {
      const video = videoRef.current;
      if (!video || !visibleRef.current) return;
      if (restart) video.currentTime = 0;
      if (withSound) {
        await enableSound(restart);
        return;
      }
      video.muted = true;
      setIsMuted(true);
      try {
        await video.play();
      } catch {
        /* ignore */
      }
    },
    [enableSound],
  );

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const next = entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO;
        visibleRef.current = next;
        if (!next) stopVideo();
      },
      { threshold: [0, VISIBLE_RATIO, 0.55, 0.75] },
    );
    observer.observe(section);

    const onScroll = () => {
      if (visibleRef.current) void playVisible(true, false);
      else stopVideo();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onScroll);
      window.removeEventListener("touchmove", onScroll);
      stopVideo();
    };
  }, [playVisible, stopVideo]);

  useEffect(() => {
    setActive(demos[0].id);
  }, [vertical, demos]);

  const selectTab = (id: DemoTab["id"]) => {
    setActive(id);
    setIsMuted(true);
    requestAnimationFrame(() => {
      if (visibleRef.current) void enableSound(true);
    });
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.muted) {
      void enableSound(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
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
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">{config.headline}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/55 sm:text-base">{config.subhead}</p>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-[#b59b78]/80 sm:text-sm">
            {config.identityLine}
          </p>
        </div>

        <div className="-mx-2 mt-8 flex gap-2 overflow-x-auto px-2 pb-1 snap-x snap-mandatory sm:mx-0 sm:justify-center sm:overflow-visible sm:px-0">
          {demos.map((t) => (
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
            key={`${vertical}-${tab.id}`}
            className="aspect-video w-full bg-black object-contain"
            loop
            playsInline
            muted={isMuted}
            controls
            preload="auto"
            aria-label={`Effiroad ${tab.label} demo`}
            onVolumeChange={syncMuted}
            onLoadedData={syncMuted}
          >
            <source src={`${tab.mp4}?v=${CACHE_V}`} type="video/mp4" />
          </video>

          <button
            type="button"
            onClick={toggleMute}
            className="absolute bottom-3 right-3 z-20 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[#9a7f5e] text-white shadow-lg shadow-black/50 transition hover:bg-[#b59b78] sm:bottom-4 sm:right-4 sm:h-12 sm:w-12"
            aria-label={isMuted ? "Turn sound on" : "Turn sound off"}
            title={isMuted ? "Turn sound on" : "Turn sound off"}
          >
            {isMuted ? (
              <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>

          {isMuted ? (
            <button
              type="button"
              onClick={() => void enableSound(false)}
              className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/35 transition hover:bg-black/45"
              aria-label="Tap to turn on demo sound"
            >
              <span className="flex items-center gap-2 rounded-full bg-[#9a7f5e] px-5 py-3 text-sm font-semibold text-white shadow-xl sm:text-base">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
                Tap for sound
              </span>
            </button>
          ) : null}
        </div>

        <p className="mt-4 text-center text-xs text-white/45 sm:mt-6">
          {tab.hint}
          {(active === "voice" || active === "risk-hold") && config.voiceFootnote ? (
            <span className="mt-1 block text-[#b59b78]">{config.voiceFootnote}</span>
          ) : null}
        </p>
      </Container>
    </section>
  );
}
