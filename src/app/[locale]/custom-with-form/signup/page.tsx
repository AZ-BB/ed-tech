import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { CustomWithFormSignupForm } from "@/components/auth/custom-with-form-signup-form";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return {
    title: dict.customWithFormSignup.metadataTitle,
    description: dict.customWithFormSignup.metadataDescription,
  };
}

export default function CustomWithFormSignupPage() {
  return <CustomWithFormSignupForm fontClassName={cairo.className} />;
}
