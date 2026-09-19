import type { Metadata } from "next";
import { SignupWizard } from "@/components/auth/signup-wizard";
import { isPublicSignupSearchParam } from "@/lib/signup-page-url";

export const metadata: Metadata = {
  title: "Get started | Univeera",
  description:
    "Create your Univeera account — personalized guidance for your university journey.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawCode = sp.code;
  const initialSchoolCode =
    typeof rawCode === "string" ? rawCode.trim() : "";
  const initialPublicSignup = isPublicSignupSearchParam(sp.public);

  return (
    <SignupWizard
      initialSchoolCode={initialSchoolCode}
      initialPublicSignup={initialPublicSignup}
    />
  );
}
