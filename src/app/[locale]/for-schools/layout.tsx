import type { Metadata } from "next";
import "./for-schools.css";
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
    title: dict.forSchools.metadataTitle,
    description: dict.forSchools.metadataDescription,
  };
}

export default function ForSchoolsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="for-schools-route">{children}</div>
      <LandingFooter />
    </>
  );
}
