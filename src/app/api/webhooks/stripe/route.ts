import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe/config";
import { markApplicationPaymentPaid } from "@/lib/stripe/mark-payment-paid";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const paymentIdRaw = session.metadata?.payment_id?.trim();
  if (!paymentIdRaw) {
    console.warn("[stripe webhook] checkout.session.completed missing payment_id metadata");
    return;
  }

  const paymentId = Number.parseInt(paymentIdRaw, 10);
  if (!Number.isFinite(paymentId) || paymentId < 1) {
    console.warn("[stripe webhook] invalid payment_id metadata", paymentIdRaw);
    return;
  }

  const applicationIdRaw = session.metadata?.application_id?.trim();
  const applicationId = applicationIdRaw
    ? Number.parseInt(applicationIdRaw, 10)
    : NaN;
  const applicationRef =
    Number.isFinite(applicationId) && applicationId > 0
      ? `application #${applicationId}`
      : "application support";

  const result = await markApplicationPaymentPaid(paymentId, {
    message: `Stripe payment completed for ${applicationRef}.`,
  });

  if (!result.ok) {
    console.error("[stripe webhook] mark paid failed", result.error);
    throw new Error(result.error);
  }
}

export async function POST(request: Request) {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    console.error("[stripe webhook] Stripe client is not configured");
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe webhook] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
    }
  } catch (err) {
    console.error("[stripe webhook] handler error:", err);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
