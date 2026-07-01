"use client";

import { useLayoutEffect } from "react";

/** Keeps `<html dir="ltr">` on staff portals when navigating from localized student routes. */
export function ForceLtrDocument() {
  useLayoutEffect(() => {
    if (document.documentElement.dir !== "ltr") {
      document.documentElement.dir = "ltr";
    }
  }, []);

  return null;
}
