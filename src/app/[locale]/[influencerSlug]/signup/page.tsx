import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { notFound } from "next/navigation";
import { dynamicInfluencerStudentSignUp } from "@/actions/auth";
import { CustomWithFormSignupForm } from "@/components/auth/custom-with-form-signup-form";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getActiveInfluencerFunnelBySlug } from "@/lib/influencer-funnels";
import { isReservedInfluencerSlug } from "@/lib/influencer-funnel-slugs";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: Locale; influencerSlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return {
    title: dict.customWithFormSignup.metadataTitle,
    description: dict.customWithFormSignup.metadataDescription,
  };
}

export default async function DynamicInfluencerSignupPage({ params }: PageProps) {
  const { influencerSlug } = await params;
  const normalizedSlug = influencerSlug.trim().toLowerCase();

  if (isReservedInfluencerSlug(normalizedSlug)) {
    notFound();
  }

  const funnel = await getActiveInfluencerFunnelBySlug(normalizedSlug);
  if (!funnel) {
    notFound();
  }

  return (
    <CustomWithFormSignupForm
      fontClassName={cairo.className}
      landingHref={`/${funnel.slug}`}
      signUp={dynamicInfluencerStudentSignUp}
      calendlyUrl={funnel.calendly_scheduling_url}
      influencerFunnelSlug={funnel.slug}
    />
  );
}
