"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";

import { useStudentFeatureGate } from "./student-feature-gate-provider";

type ProgramFitTestLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href?: string;
};

/** Navigates to the fit test, or opens the funnel subscription modal instead. */
export function ProgramFitTestLink({
  href = "/student/program-fit-test",
  onClick,
  children,
  ...rest
}: ProgramFitTestLinkProps) {
  const { guardFunnelSubscriptionAction } = useStudentFeatureGate();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!guardFunnelSubscriptionAction("program_discovery")) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
