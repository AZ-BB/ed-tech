import { PaymentRequestCheckout } from "@/components/payments/payment-request-checkout";
import {
  PaymentRequestCheckoutError,
  PaymentRequestCheckoutShell,
} from "@/components/payments/payment-request-checkout-shell";
import { resolveStandalonePaymentCheckout } from "@/lib/stripe/resolve-standalone-payment-checkout";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function StandalonePayPage({ params }: PageProps) {
  const { token } = await params;
  const result = await resolveStandalonePaymentCheckout(token);

  if (result.type === "redirect_success") {
    redirect("/pay/success");
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
