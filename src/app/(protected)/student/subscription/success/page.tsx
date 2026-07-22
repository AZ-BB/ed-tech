import { confirmFunnelSubscriptionFromSession } from "@/lib/stripe/confirm-funnel-subscription-from-session";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { canManageFunnelSubscription } from "@/lib/student-subscription";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function StudentSubscriptionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  if (!canManageFunnelSubscription(auth)) {
    redirect("/student");
  }

  const params = await searchParams;
  const sessionId = params.session_id?.trim();

  let message = "Your subscription is being activated. Refresh the dashboard in a moment.";
  if (sessionId) {
    const result = await confirmFunnelSubscriptionFromSession(sessionId);
    if (result.ok) {
      message = "Your monthly subscription is now active. Welcome to full Univeera access.";
    } else {
      message = result.error;
    }
  }

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center font-[family-name:var(--font-dm-sans)]">
      <h1 className="font-[family-name:var(--font-dm-serif)] text-2xl text-[var(--text)]">
        Subscription confirmed
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-light)]">{message}</p>
      <Link
        href="/student"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-[var(--green)] px-6 py-3 text-sm font-semibold text-white no-underline transition hover:bg-[var(--green-dark)]"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
