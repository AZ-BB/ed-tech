import "server-only";

import type { ProgramVideo } from "@/lib/programs-discovery-types";
import { parseYouTubeVideoId } from "@/lib/youtube";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const OEMBED_TIMEOUT_MS = 5000;

type CacheEntry = {
  available: boolean;
  expiresAt: number;
};

const availabilityCache = new Map<string, CacheEntry>();

export async function isYouTubeVideoAvailable(videoId: string): Promise<boolean> {
  const normalizedId = parseYouTubeVideoId(videoId);
  if (!normalizedId) return false;

  const cached = availabilityCache.get(normalizedId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.available;
  }

  let available = true;

  try {
    const watchUrl = `https://www.youtube.com/watch?v=${normalizedId}`;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const response = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS),
      next: { revalidate: 86_400 },
    });
    available = response.ok;
  } catch {
    // If YouTube is unreachable, keep the video rather than hiding valid links.
    available = true;
  }

  availabilityCache.set(normalizedId, {
    available,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return available;
}

export async function filterValidProgramVideos(
  videos: ProgramVideo[],
): Promise<ProgramVideo[]> {
  if (videos.length === 0) return [];

  const validated = await Promise.all(
    videos.map(async (video) => {
      const youtubeId = parseYouTubeVideoId(video.youtube_id);
      if (!youtubeId) return null;

      const available = await isYouTubeVideoAvailable(youtubeId);
      if (!available) return null;

      return youtubeId === video.youtube_id
        ? video
        : { ...video, youtube_id: youtubeId };
    }),
  );

  return validated.filter((video): video is ProgramVideo => video !== null);
}
