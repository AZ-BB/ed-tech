import type { Metadata } from "next";
import { CustomSignupForm } from "@/components/auth/custom-signup-form";
import { dianaStudentSignUp } from "@/actions/auth";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return {
    title: dict.customSignup.metadataTitle,
    description: dict.customSignup.metadataDescription,
  };
}

export default function DianaSignupPage() {
  return <CustomSignupForm landingHref="/diana" signUp={dianaStudentSignUp} />;
}
