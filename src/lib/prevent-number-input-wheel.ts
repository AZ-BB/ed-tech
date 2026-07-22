import type { WheelEvent } from "react";

/** Prevent mouse wheel from incrementing/decrementing focused number inputs. */
export function preventNumberInputWheelScroll(
  event: WheelEvent<HTMLInputElement>,
): void {
  event.currentTarget.blur();
}
