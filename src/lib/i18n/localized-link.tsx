"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { localizePath } from "./config";
import { useLocale } from "./locale-context";

type LocalizedLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

export function LocalizedLink({ href, ...props }: LocalizedLinkProps) {
  const { locale } = useLocale();
  const localizedHref = href.startsWith("http") || href.startsWith("#")
    ? href
    : localizePath(href, locale);
  return <Link href={localizedHref} {...props} />;
}
