import Link from "next/link";
import type { ComponentProps } from "react";
import { localizePath, type Locale } from "./config";

type ServerLocalizedLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  locale: Locale;
};

export function ServerLocalizedLink({
  href,
  locale,
  ...props
}: ServerLocalizedLinkProps) {
  const localizedHref =
    href.startsWith("http") || href.startsWith("#")
      ? href
      : localizePath(href, locale);

  return <Link href={localizedHref} {...props} />;
}
