import type { Json } from "@/database.types";
import { provisionIndependentStudent } from "@/lib/provision-independent-student";
import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";
import { parseStudentFeatureAccess } from "@/lib/student-feature-access";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): { ok: true } | { ok: false; status: 401 | 503 } {
  const secret = process.env.STUDENT_PROVISION_API_KEY?.trim();
  if (!secret) {
    return { ok: false, status: 503 };
  }

  const authHeader = request.headers.get("authorization")?.trim();
  if (!authHeader) {
    return { ok: false, status: 401 };
  }

  const [scheme, token] = authHeader.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || token !== secret) {
    return { ok: false, status: 401 };
  }

  return { ok: true };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function buildMagicLinkRedirectUrl(email: string): Promise<
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string }
> {
  const siteBase = await getPublicSiteBaseUrl();
  const redirectTo = `${siteBase}/auth/confirm?next=${encodeURIComponent("/student")}`;

  const secret = await createSupabaseSecretClient();
  const { data, error } = await secret.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (error) {
    console.error("[api/students/independent] generateLink", error);
    return {
      ok: false,
      error: error.message || "Could not create auto sign-in link.",
    };
  }

  const actionLink = data?.properties?.action_link?.trim();
  if (actionLink) {
    return { ok: true, redirectUrl: actionLink };
  }

  const hashedToken = data?.properties?.hashed_token?.trim();
  if (hashedToken) {
    return {
      ok: true,
      redirectUrl: `${siteBase}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink&next=${encodeURIComponent("/student")}`,
    };
  }

  return {
    ok: false,
    error: "Could not create auto sign-in link.",
  };
}

export async function POST(request: Request) {
  const auth = isAuthorized(request);
  if (!auth.ok) {
    if (auth.status === 503) {
      return NextResponse.json(
        {
          error:
            "Student provision API is not configured. Set STUDENT_PROVISION_API_KEY.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const grade = String(body.grade ?? "").trim();
  const nationalityCountryCode = String(body.nationalityCountryCode ?? "").trim();

  let featureAccessRaw: Json | null = null;
  if (body.featureAccess !== undefined && body.featureAccess !== null) {
    if (!isPlainObject(body.featureAccess)) {
      return NextResponse.json(
        { error: "featureAccess must be a JSON object." },
        { status: 400 },
      );
    }
    featureAccessRaw = body.featureAccess as Json;
  }

  let metaData: Json | null = null;
  if (body.metaData !== undefined && body.metaData !== null) {
    if (!isPlainObject(body.metaData)) {
      return NextResponse.json(
        { error: "metaData must be a JSON object or null." },
        { status: 400 },
      );
    }
    metaData = body.metaData as Json;
  }

  const provisioned = await provisionIndependentStudent({
    firstName,
    lastName,
    email,
    grade,
    nationalityCountryCode,
    featureAccess: parseStudentFeatureAccess(featureAccessRaw),
    metaData,
  });

  if (!provisioned.ok) {
    return NextResponse.json(
      { error: provisioned.error },
      { status: provisioned.status },
    );
  }

  const link = await buildMagicLinkRedirectUrl(provisioned.email);
  if (!link.ok) {
    // Student already exists; surface link failure so caller can retry link generation separately if needed.
    console.error(
      "[api/students/independent] student created but magic link failed",
      provisioned.studentId,
      link.error,
    );
    return NextResponse.json(
      {
        error: link.error,
        studentId: provisioned.studentId,
        email: provisioned.email,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      studentId: provisioned.studentId,
      email: provisioned.email,
      redirectUrl: link.redirectUrl,
    },
    { status: 201 },
  );
}
