import type { Metadata } from "next";
import { IndividualSignupForm } from "@/components/auth/individual-signup-form";

export const metadata: Metadata = {
  title: "Individual signup | Univeera",
  description:
    "Create your Univeera account as an individual student — personalized guidance for your university journey.",
};

export default function IndividualSignupPage() {
  return <IndividualSignupForm />;
}
