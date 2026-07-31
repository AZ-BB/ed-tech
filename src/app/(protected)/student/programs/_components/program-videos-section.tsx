"use client";

import { useCallback, useState, type CSSProperties } from "react";

import type { ProgramVideo } from "@/lib/programs-discovery-types";

import detailStyles from "./program-detail.module.css";

type ProgramVideosSectionProps = {
  videos: ProgramVideo[];
  eyebrow: string;
  title: string;
  subtitle: string;
};

/** YouTube serves a tiny placeholder image when a video is unavailable. */
function isUnavailableYouTubeThumbnail(img: HTMLImageElement): boolean {
  return img.naturalWidth > 0 && img.naturalWidth <= 120;
}

function ProgramVideoCard({
  video,
  onValidated,
}: {
  video: ProgramVideo;
  onValidated: (videoId: string, valid: boolean) => void;
}) {
  const [visible, setVisible] = useState<boolean | null>(null);
  const thumbUrl = `https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`;

  const reportValidation = useCallback(
    (valid: boolean) => {
      setVisible(valid);
      onValidated(video.youtube_id, valid);
    },
    [onValidated, video.youtube_id],
  );

  if (visible === false) return null;

  return (
    <>
      {visible === null ? (
        <img
          src={thumbUrl}
          alt=""
          aria-hidden
          className="sr-only"
          onLoad={(event) => {
            reportValidation(!isUnavailableYouTubeThumbnail(event.currentTarget));
          }}
          onError={() => reportValidation(false)}
        />
      ) : null}
      {visible ? (
        <a
          href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={detailStyles.videoCard}
        >
          <div
            className={detailStyles.videoThumb}
            style={
              {
                backgroundImage: `url(${thumbUrl})`,
              } as CSSProperties
            }
          >
            <div className={detailStyles.videoPlay}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            </div>
          </div>
          <div className={detailStyles.videoMeta}>
            {video.category ? (
              <div className={detailStyles.videoCat}>{video.category}</div>
            ) : null}
            <div className={detailStyles.videoTitle}>{video.title}</div>
            {video.channel ? (
              <div className={detailStyles.videoChannel}>{video.channel}</div>
            ) : null}
          </div>
        </a>
      ) : null}
    </>
  );
}

export function ProgramVideosSection({
  videos,
  eyebrow,
  title,
  subtitle,
}: ProgramVideosSectionProps) {
  const [validation, setValidation] = useState<Record<string, boolean>>({});

  const onValidated = useCallback((videoId: string, valid: boolean) => {
    setValidation((current) => ({ ...current, [videoId]: valid }));
  }, []);

  if (videos.length === 0) return null;

  const checkedCount = Object.keys(validation).length;
  const validCount = Object.values(validation).filter(Boolean).length;
  const finishedChecking = checkedCount === videos.length;

  if (finishedChecking && validCount === 0) return null;

  if (!finishedChecking && validCount === 0) {
    return (
      <>
        {videos.map((video) => (
          <ProgramVideoCard
            key={video.youtube_id}
            video={video}
            onValidated={onValidated}
          />
        ))}
      </>
    );
  }

  return (
    <section className={detailStyles.section}>
      <div className={detailStyles.sectionEyebrow}>{eyebrow}</div>
      <h2 className={detailStyles.sectionTitle}>{title}</h2>
      <p className={detailStyles.sectionSub}>{subtitle}</p>
      <div className={detailStyles.videosGrid}>
        {videos.map((video) => (
          <ProgramVideoCard
            key={video.youtube_id}
            video={video}
            onValidated={onValidated}
          />
        ))}
      </div>
    </section>
  );
}
