import clsx from "clsx";

import { metricToScore } from "../_lib/program-discovery-metrics";
import explorerStyles from "./programs-explorer.module.css";

export function MetricBars({ value, max = 5 }: { value: string; max?: number }) {
  const score = metricToScore(value);
  if (!score) return <span className="text-[11px] text-[var(--text-hint)]">—</span>;

  return (
    <div className={explorerStyles.metaBars} aria-hidden>
      {Array.from({ length: max }, (_, index) => (
        <span
          key={index}
          className={clsx(
            explorerStyles.metaBar,
            index < score && explorerStyles.metaBarOn,
          )}
        />
      ))}
    </div>
  );
}
