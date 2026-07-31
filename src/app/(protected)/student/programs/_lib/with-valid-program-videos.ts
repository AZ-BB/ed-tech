import "server-only";

import { filterValidProgramVideos } from "@/lib/youtube-availability";

import type { DiscoveryProgram } from "./program-row-to-program";

export async function withValidProgramVideos(
  program: DiscoveryProgram,
): Promise<DiscoveryProgram> {
  const videos = await filterValidProgramVideos(program.videos);
  if (videos.length === program.videos.length) return program;
  return { ...program, videos };
}
