"use client";

import { useEffect, useRef, useId } from "react";
import { extractYouTubeVideoId } from "@/learn/lib/ingest/youtube";
import { useMindmapSyncOptional } from "@/learn/components/mindmap/MindmapSyncContext";

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: () => void;
            onStateChange?: (e: { data: number }) => void;
          };
        },
      ) => {
        seekTo: (sec: number, allowSeek: boolean) => void;
        getCurrentTime: () => number;
        destroy: () => void;
      };
      PlayerState: { PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) return;

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });

  return ytApiPromise;
}

type Props = {
  youtubeUrl: string;
  className?: string;
};

export function SyncedYouTubePlayer({ youtubeUrl, className }: Props) {
  const sync = useMindmapSyncOptional();
  const syncRef = useRef(sync);
  syncRef.current = sync;
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<InstanceType<NonNullable<typeof window.YT>["Player"]> | null>(null);
  const rafRef = useRef<number>(0);
  const domId = useId().replace(/:/g, "");

  const videoId = extractYouTubeVideoId(youtubeUrl);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    let cancelled = false;

    void loadYouTubeApi().then(() => {
      if (cancelled || !window.YT || !containerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: () => {
            syncRef.current?.seekRef && (syncRef.current.seekRef.current = (sec: number) => {
              playerRef.current?.seekTo(sec, true);
            });
          },
        },
      });

      const tick = () => {
        if (playerRef.current && syncRef.current) {
          try {
            const t = playerRef.current.getCurrentTime();
            if (Number.isFinite(t)) syncRef.current.setCurrentTimeSec(t);
          } catch {
            // player not ready
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (syncRef.current?.seekRef) syncRef.current.seekRef.current = null;
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
    };
  }, [videoId, domId]);

  if (!videoId) return null;

  return (
    <div className={className ?? "aspect-video w-full overflow-hidden rounded-2xl bg-learn-ink"}>
      <div ref={containerRef} id={`yt-${domId}`} className="h-full w-full" />
    </div>
  );
}
