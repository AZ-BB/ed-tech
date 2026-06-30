import type { Metadata } from "next";
import "./for-advisors.css";
import { LandingFooter } from "@/components/landing/landing-footer";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return {
    title: dict.forAdvisors.metadataTitle,
    description: dict.forAdvisors.metadataDescription,
  };
}

export default function ForAdvisorsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="for-advisors-route">{children}</div>
      <LandingFooter />
    </>
  );
}
