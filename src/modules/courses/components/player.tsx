"use client";

import { useCallback, useEffect, useRef } from "react";
import type { VideoSource } from "../types";

/** Seconds of playback between progress saves. */
const SAVE_EVERY = 10;

export interface PlayerEvents {
  /** Called with the current position; `ended` when the video finished. */
  onProgress: (positionSec: number, ended: boolean) => void;
}

/**
 * One player for both sources: native <video> for uploads and direct links,
 * the YouTube IFrame API for YouTube. Resumes at `startAt` and reports
 * progress every few seconds, on pause, on tab hide and on leave.
 */
export function VideoPlayer({ video, src, startAt, durationSec, onProgress }: { video: VideoSource; src: string; startAt: number; durationSec: number } & PlayerEvents) {
  return video.kind === "youtube" ? (
    <YouTubePlayer id={video.src} startAt={startAt} onProgress={onProgress} />
  ) : (
    <NativePlayer src={src} startAt={startAt} durationSec={durationSec} onProgress={onProgress} />
  );
}

function useReporter(onProgress: PlayerEvents["onProgress"]) {
  const last = useRef(-SAVE_EVERY);
  const cb = useRef(onProgress);
  cb.current = onProgress;
  return useCallback((pos: number, force = false, ended = false) => {
    if (ended || force || Math.abs(pos - last.current) >= SAVE_EVERY) {
      last.current = pos;
      cb.current(pos, ended);
    }
  }, []);
}

function NativePlayer({ src, startAt, durationSec, onProgress }: { src: string; startAt: number; durationSec: number } & PlayerEvents) {
  const ref = useRef<HTMLVideoElement>(null);
  const report = useReporter(onProgress);

  // Resume. The server-rendered <video> may load its metadata before React hydrates,
  // in which case onLoadedMetadata never fires; so check readyState on mount too.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const seek = () => {
      const total = v.duration || durationSec;
      // Don't resume into the very end (last 10%, at most 5s); start over instead.
      if (startAt > 1 && startAt < total - Math.min(5, total * 0.1)) v.currentTime = startAt;
    };
    if (v.readyState >= 1) seek();
    else v.addEventListener("loadedmetadata", seek, { once: true });
    return () => v.removeEventListener("loadedmetadata", seek);
  }, [src, startAt, durationSec]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const flush = () => v.currentTime > 0 && report(v.currentTime, true);
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [report]);

  return (
    <video
      ref={ref}
      key={src}
      src={src}
      controls
      playsInline
      preload="metadata"
      controlsList="nodownload"
      onContextMenu={(e) => e.preventDefault()}
      className="size-full bg-black"
      onTimeUpdate={(e) => report(e.currentTarget.currentTime)}
      onPause={(e) => !e.currentTarget.ended && report(e.currentTarget.currentTime, true)}
      onEnded={(e) => report(e.currentTarget.duration, true, true)}
    />
  );
}

/* ---------------- YouTube ---------------- */

interface YTPlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
}
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer; PlayerState: { ENDED: number; PAUSED: number } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytReady: Promise<void> | null = null;
function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve();
  ytReady ??= new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(s);
  });
  return ytReady;
}

function YouTubePlayer({ id, startAt, onProgress }: { id: string; startAt: number } & PlayerEvents) {
  const host = useRef<HTMLDivElement>(null);
  const report = useReporter(onProgress);

  useEffect(() => {
    let player: YTPlayer | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    const mount = document.createElement("div");
    host.current?.appendChild(mount);

    loadYouTube().then(() => {
      if (cancelled || !window.YT) return;
      player = new window.YT.Player(mount, {
        videoId: id,
        width: "100%",
        height: "100%",
        host: "https://www.youtube-nocookie.com",
        playerVars: { start: Math.floor(startAt), rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: (e: { data: number }) => {
            if (!player) return;
            if (e.data === window.YT!.PlayerState.ENDED) report(player.getDuration(), true, true);
            else if (e.data === window.YT!.PlayerState.PAUSED) report(player.getCurrentTime(), true);
          },
        },
      });
      timer = setInterval(() => player && report(player.getCurrentTime()), 2000);
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      try {
        if (player) report(player.getCurrentTime(), true);
        player?.destroy();
      } catch {}
      mount.remove();
    };
  }, [id, startAt, report]);

  return <div ref={host} className="size-full bg-black [&_iframe]:size-full" />;
}
