import { Building2, Home, Info, Monitor, Wrench } from "lucide-react";

import type { EventTypeStyleKey } from "@/lib/event-type-styles";

type EventTypeIconProps = {
  typeKey: EventTypeStyleKey;
  className?: string;
  color?: string;
};

export function EventTypeIcon({ typeKey, className, color }: EventTypeIconProps) {
  const props = {
    className,
    strokeWidth: 1.8,
    style: color ? { color } : undefined,
    "aria-hidden": true as const,
  };

  switch (typeKey) {
    case "open-day":
      return <Building2 {...props} />;
    case "webinar":
      return <Monitor {...props} />;
    case "workshop":
      return <Wrench {...props} />;
    case "info":
      return <Info {...props} />;
    default:
      return <Home {...props} />;
  }
}
