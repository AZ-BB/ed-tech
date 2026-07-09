import type { InterestTile, ProgramRailConfig } from "./program-discovery-constants";

type InterestTileLabels = Pick<
  InterestTile,
  "title" | "meta" | "listEyebrow" | "listTitle" | "listSubtitle" | "listNote"
>;

type InterestTileWithCount = InterestTile & { count?: number };

type ProgramsDiscoveryCopy = {
  interestTiles: Record<string, InterestTileLabels>;
  rails: Record<string, { eyebrow: string; title: string }>;
};

export function localizeInterestTile(
  tile: InterestTileWithCount,
  copy: ProgramsDiscoveryCopy,
): InterestTileWithCount {
  const labels = copy.interestTiles[tile.id];
  if (!labels) return tile;
  return {
    ...tile,
    ...labels,
  };
}

export function localizeInterestTiles(
  tiles: InterestTileWithCount[],
  copy: ProgramsDiscoveryCopy,
): InterestTileWithCount[] {
  return tiles.map((tile) => localizeInterestTile(tile, copy));
}

export function localizeProgramRail(
  rail: ProgramRailConfig,
  copy: ProgramsDiscoveryCopy,
): Pick<ProgramRailConfig, "id" | "filter"> & { eyebrow: string; title: string } {
  const labels = copy.rails[rail.id];
  return {
    id: rail.id,
    filter: rail.filter,
    eyebrow: labels?.eyebrow ?? rail.eyebrow,
    title: labels?.title ?? rail.title,
  };
}
