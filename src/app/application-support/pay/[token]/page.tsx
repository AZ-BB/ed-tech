import { PaymentRequestCheckout } from "@/components/payments/payment-request-checkout";
import {
  PaymentRequestCheckoutError,
  PaymentRequestCheckoutShell,
} from "@/components/payments/payment-request-checkout-shell";
import { resolveApplicationPaymentCheckout } from "@/lib/stripe/resolve-application-payment-checkout";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function ApplicationSupportPayPage({ params }: PageProps) {
  const { token } = await params;
  const result = await resolveApplicationPaymentCheckout(token);

  if (result.type === "redirect_success") {
    redirect(
      `/application-support/payment/success?application_id=${result.applicationId}`,
    );
  }

  if (result.type === "error") {
    return <PaymentRequestCheckoutError message={result.message} />;
  }

  return (
    <PaymentRequestCheckoutShell>
      <PaymentRequestCheckout
        clientSecret={result.clientSecret}
        title={result.title}
        description={result.description}
      />
    </PaymentRequestCheckoutShell>
  );
}
