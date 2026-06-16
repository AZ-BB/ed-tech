import { redirect } from "next/navigation";

import { AdvisorPaymentsClient } from "./_components/advisor-payments-client";
import {
  fetchAdvisorPaymentsPanel,
  parseAdvisorPaymentRequestStatusFilter,
  parseAdvisorPaymentsSearch,
  parseAdvisorPaymentsTab,
  parseAdvisorPayoutStatusFilter,
} from "./_lib/fetch-advisor-payments-page";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdvisorPaymentsPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const tab = parseAdvisorPaymentsTab(sp.tab);
  const paymentRequestsPage = Math.max(1, parseIntParam(sp.paymentRequestsPage, 1));
  const paymentRequestsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.paymentRequestsLimit, 10)),
  );
  const paymentRequestsSearch = parseAdvisorPaymentsSearch(sp.search);
  const paymentRequestsStatus = parseAdvisorPaymentRequestStatusFilter(sp.paymentStatus);
  const payoutsPage = Math.max(1, parseIntParam(sp.payoutsPage, 1));
  const payoutsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.payoutsLimit, 10)),
  );
  const payoutsStatus = parseAdvisorPayoutStatusFilter(sp.payoutStatus);

  const panel = await fetchAdvisorPaymentsPanel({
    tab,
    paymentRequestsPage,
    paymentRequestsLimit,
    paymentRequestsSearch,
    paymentRequestsStatus,
    payoutsPage,
    payoutsLimit,
    payoutsStatus,
  });

  if (!panel) {
    redirect("/login");
  }

  return <AdvisorPaymentsClient {...panel} />;
}
