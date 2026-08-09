"use client";

import { useRef, useState, type KeyboardEvent } from "react";

const LANDING_VIDEO_URL =
  "https://cqtqhrvyakjiafaxpijd.supabase.co/storage/v1/object/public/landing-page/landing.mp4";

type LandingPlatformVideoProps = {
  badge: string;
  title: string;
};

export function LandingPlatformVideo({ badge, title }: LandingPlatformVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const startPlayback = () => {
    const video = videoRef.current;
    if (!video || playing) return;

    setPlaying(true);
    void video.play().catch(() => {
      setPlaying(false);
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (playing) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      startPlayback();
    }
  };

  return (
    <div
      className={`video-frame${playing ? " is-playing" : ""}`}
      role={playing ? undefined : "button"}
      tabIndex={playing ? undefined : 0}
      aria-label={playing ? undefined : title}
      onClick={playing ? undefined : startPlayback}
      onKeyDown={playing ? undefined : onKeyDown}
    >
      <video
        ref={videoRef}
        src={LANDING_VIDEO_URL}
        controls={playing}
        playsInline
        preload="none"
        title={title}
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <>
          <div className="video-play">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className="video-badge">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            {badge}
          </div>
        </>
      )}
    </div>
  );
}
