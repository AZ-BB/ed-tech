import { buildSignupPagePath } from "@/lib/signup-page-url";
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ schoolCode: string }>;
};

export default async function PublicSchoolCodeSignupRedirectPage({
  params,
}: PageProps) {
  const { schoolCode: rawSegment } = await params;
  let code: string;
  try {
    code = decodeURIComponent(rawSegment).trim();
  } catch {
    redirect("/signup");
  }

  if (!code) {
    redirect("/signup");
  }

  redirect(buildSignupPagePath({ code, public: true }));
}
