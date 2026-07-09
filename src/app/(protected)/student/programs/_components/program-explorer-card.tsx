import Link from "next/link";
import clsx from "clsx";

import {
  iconVariantForSlug,
  type ProgramIconVariant,
} from "../_lib/program-discovery-constants";
import type { DiscoveryProgram } from "../_lib/program-row-to-program";
import { MetricBars } from "./program-metric-bars";
import explorerStyles from "./programs-explorer.module.css";

const ICON_CLASS: Record<ProgramIconVariant, string> = {
  bgGreen: explorerStyles.bgGreen,
  bgBlue: explorerStyles.bgBlue,
  bgOrange: explorerStyles.bgOrange,
  bgPurple: explorerStyles.bgPurple,
  bgPink: explorerStyles.bgPink,
  bgYellow: explorerStyles.bgYellow,
};

type ProgramExplorerCardProps = {
  program: DiscoveryProgram;
  grid?: boolean;
  salaryLabel: string;
  demandLabel: string;
};

export function ProgramExplorerCard({
  program,
  grid = false,
  salaryLabel,
  demandLabel,
}: ProgramExplorerCardProps) {
  const variant = iconVariantForSlug(program.slug);
  const initials = program.title
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <Link
      href={`/student/programs/${program.slug}`}
      className={clsx(
        explorerStyles.programCard,
        grid && explorerStyles.programCardGrid,
      )}
    >
      <div className={explorerStyles.programCardTop}>
        <div
          className={clsx(explorerStyles.programIcon, ICON_CLASS[variant])}
          aria-hidden
        >
          {initials}
        </div>
        <div className={explorerStyles.programCat}>{program.category}</div>
      </div>
      <div className={explorerStyles.programName}>{program.title}</div>
      <p className={explorerStyles.programHook}>
        {program.shortDescription || program.description}
      </p>
      <div className={explorerStyles.programMeta}>
        <div className={explorerStyles.metaItem}>
          <span className={explorerStyles.metaLabel}>{salaryLabel}</span>
          <MetricBars value={program.salaryPotential} />
        </div>
        <div className={explorerStyles.metaItem}>
          <span className={explorerStyles.metaLabel}>{demandLabel}</span>
          <MetricBars value={program.demandLevel} />
        </div>
      </div>
    </Link>
  );
}
