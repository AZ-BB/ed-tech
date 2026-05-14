import type { Metadata } from "next";
import { SignupWizard } from "@/components/auth/signup-wizard";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export const metadata: Metadata = {
  title: "Get started | Univeera",
  description:
    "Create your Univeera account — personalized guidance for your university journey.",
};

export default function SignupPage() {

  return <SignupWizard />;
}
