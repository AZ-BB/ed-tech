import { PaymentRequestCheckout } from "@/components/payments/payment-request-checkout";
import {
  PaymentRequestCheckoutError,
  PaymentRequestCheckoutShell,
} from "@/components/payments/payment-request-checkout-shell";
import { resolvePostAdmissionPaymentCheckout } from "@/lib/stripe/resolve-post-admission-payment-checkout";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function PostAdmissionSupportPayPage({ params }: PageProps) {
  const { token } = await params;
  const result = await resolvePostAdmissionPaymentCheckout(token);

  if (result.type === "redirect_success") {
    redirect(`/post-admission-support/payment/success?case_id=${result.caseId}`);
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
        successReturnPath={result.successReturnPath}
      />
    </PaymentRequestCheckoutShell>
  );
}
