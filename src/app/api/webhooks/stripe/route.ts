import { confirmCustomSubscriptionFromSession } from "@/lib/stripe/confirm-custom-subscription-from-session";
import { confirmPaymentFromSession } from "@/lib/stripe/confirm-application-payment-from-session";
import { confirmFunnelSubscriptionFromSession } from "@/lib/stripe/confirm-funnel-subscription-from-session";
import { confirmIndividualSignupPaymentFromSession } from "@/lib/stripe/confirm-individual-signup-payment-from-session";
import {
  constructStripeWebhookEvent,
  getStripeClient,
  getStripeWebhookSecrets,
} from "@/lib/stripe/config";
import { syncStudentSubscriptionFromStripe } from "@/lib/stripe/sync-student-subscription";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const sessionId = session.id?.trim();
  if (!sessionId) {
    console.warn("[stripe webhook] checkout.session.completed missing session id");
    return;
  }

  if (session.metadata?.kind === "funnel_subscription") {
    const result = await confirmFunnelSubscriptionFromSession(sessionId);
    if (!result.ok) {
      console.error("[stripe webhook] funnel subscription confirm failed", result.error);
      throw new Error(result.error);
    }
    return;
  }

  if (session.metadata?.kind === "custom_subscription") {
    const result = await confirmCustomSubscriptionFromSession(sessionId);
    if (!result.ok) {
      console.error("[stripe webhook] custom subscription confirm failed", result.error);
      throw new Error(result.error);
    }
    return;
  }

  if (session.mode === "subscription") {
    return;
  }

  if (session.metadata?.kind === "individual_signup_fee") {
    const result = await confirmIndividualSignupPaymentFromSession(sessionId);
    if (!result.ok) {
      console.error("[stripe webhook] individual signup payment confirm failed", result.error);
      throw new Error(result.error);
    }
    return;
  }

  if (session.payment_status !== "paid") {
    console.warn(
      "[stripe webhook] checkout.session.completed with non-paid status",
      session.id,
      session.payment_status,
    );
    return;
  }

  const result = await confirmPaymentFromSession(sessionId);
  if (!result.ok) {
    console.error("[stripe webhook] confirm session failed", result.error);
    throw new Error(result.error);
  }
}

async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
): Promise<void> {
  const kind = subscription.metadata?.kind?.trim();
  if (kind !== "funnel_subscription" && kind !== "custom_subscription") {
    return;
  }

  const result = await syncStudentSubscriptionFromStripe(subscription);
  if (!result.ok) {
    console.error("[stripe webhook] subscription sync failed", result.error);
    throw new Error(result.error);
  }
}

export async function POST(request: Request) {
  const webhookSecrets = getStripeWebhookSecrets();
  if (webhookSecrets.length === 0) {
    console.error(
      "[stripe webhook] STRIPE_WEBHOOK_SECRET (and optional STRIPE_CLI_WEBHOOK_SECRET) is not set",
    );
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
    event = constructStripeWebhookEvent(stripe, rawBody, signature);
  } catch (error) {
    console.error("[stripe webhook] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error:", err);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
