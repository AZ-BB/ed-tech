import type { DiscoveryProgram } from "./program-row-to-program";

export function resolvePopularProgramSlug(
  programs: DiscoveryProgram[],
  chipLabel: string,
): string | null {
  const needle = chipLabel.trim().toLowerCase();
  const slugGuess = needle.replace(/\s+/g, "-");

  const exactTitle = programs.find(
    (program) => program.title.trim().toLowerCase() === needle,
  );
  if (exactTitle) return exactTitle.slug;

  const exactSlug = programs.find(
    (program) => program.slug.trim().toLowerCase() === slugGuess,
  );
  if (exactSlug) return exactSlug.slug;

  const titleStartsWith = programs.find((program) =>
    program.title.trim().toLowerCase().startsWith(needle),
  );
  if (titleStartsWith) return titleStartsWith.slug;

  const titleIncludes = programs.find((program) =>
    program.title.trim().toLowerCase().includes(needle),
  );
  if (titleIncludes) return titleIncludes.slug;

  return null;
}
