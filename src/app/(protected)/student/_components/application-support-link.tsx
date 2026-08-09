"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useStudentFeatureGate } from "./student-feature-gate-provider";

const DEFAULT_HREF = "/student/application-support";

type ApplicationSupportLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href?: string;
};

export function ApplicationSupportLink({
  href = DEFAULT_HREF,
  onClick,
  ...props
}: ApplicationSupportLinkProps) {
  const router = useRouter();
  const { guardApplicationSupportClick } = useStudentFeatureGate();

  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        guardApplicationSupportClick(event, () => router.push(href));
      }}
    />
  );
}

export function isApplicationSupportHref(href: string): boolean {
  const normalized = href.replace(/\/$/, "") || "/";
  return (
    normalized === DEFAULT_HREF ||
    normalized.startsWith(`${DEFAULT_HREF}/`)
  );
}
