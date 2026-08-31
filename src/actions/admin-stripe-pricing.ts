"use server";

import { assertAdminPermission } from "@/lib/assert-admin-permission";
import { createStripeStudentPrice } from "@/lib/stripe/create-stripe-student-price";
import { fetchStripeStudentPricing } from "@/lib/stripe/stripe-student-pricing";
import {
  STRIPE_STUDENT_PRODUCT_KEYS,
  SUPPORTED_CURRENCIES,
  currencyAmountsEqual,
  majorToMinor,
  minorToMajor,
  type StripeStudentCurrencyAmount,
  type StripeStudentProductKey,
  type SupportedCurrency,
} from "@/lib/stripe/stripe-student-pricing-shared";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type AdminStripePricingActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

function parseProductKey(raw: FormDataEntryValue | null): StripeStudentProductKey | null {
  const value = String(raw ?? "").trim();
  return (STRIPE_STUDENT_PRODUCT_KEYS as readonly string[]).includes(value)
    ? (value as StripeStudentProductKey)
    : null;
}

function parseMajorAmount(
  raw: FormDataEntryValue | null,
  currency: SupportedCurrency,
): number | null | "invalid" {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "invalid";

  const minor = majorToMinor(currency, parsed);
  const roundTrip = minorToMajor(currency, minor);
  if (Math.abs(roundTrip - parsed) > 0.0001) return "invalid";

  return parsed;
}

function revalidatePricingPaths() {
  revalidatePath("/admin/settings");
  revalidatePath("/student");
  revalidatePath("/student/settings");
}

export async function updateStripeStudentProductPricing(
  formData: FormData,
): Promise<AdminStripePricingActionResult> {
  const access = await assertAdminPermission("edit_system_plans");
  if (!access.ok) return access;

  const productKey = parseProductKey(formData.get("productKey"));
  if (!productKey) {
    return { ok: false, error: "Invalid product." };
  }

  const currencyAmounts: StripeStudentCurrencyAmount[] = [];

  for (const currency of SUPPORTED_CURRENCIES) {
    const major = parseMajorAmount(formData.get(`amount_${currency}`), currency);
    if (major === "invalid") {
      return { ok: false, error: `Invalid amount for ${currency}.` };
    }
    if (major == null) continue;
    currencyAmounts.push({
      currency,
      amountMinor: majorToMinor(currency, major),
    });
  }

  if (currencyAmounts.length === 0) {
    return { ok: false, error: "Enter at least one currency amount." };
  }

  const allPricing = await fetchStripeStudentPricing();
  const currentProduct = allPricing[productKey];

  const amountsUnchanged = currencyAmountsEqual(
    currencyAmounts,
    currentProduct.currencies,
  );
  if (amountsUnchanged && currentProduct.stripePriceId) {
    return { ok: true, message: "No pricing changes detected." };
  }

  const createResult = await createStripeStudentPrice({
    stripeProductId: currentProduct.stripeProductId,
    billingMode: currentProduct.billingMode,
    currencies: currencyAmounts,
  });

  if (!createResult.ok) {
    return { ok: false, error: createResult.error };
  }

  const service = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { error: productError } = await service
    .from("stripe_student_products")
    .update({
      stripe_price_id: createResult.priceId,
      updated_at: now,
    })
    .eq("product_key", productKey);

  if (productError) {
    console.error("[admin-stripe-pricing] product update", productError);
    return {
      ok: false,
      error: `Stripe Price ${createResult.priceId} was created but could not be saved locally.`,
    };
  }

  const { error: deleteError } = await service
    .from("stripe_student_product_currencies")
    .delete()
    .eq("product_key", productKey);

  if (deleteError) {
    console.error("[admin-stripe-pricing] currency delete", deleteError);
    return {
      ok: false,
      error: `Stripe Price ${createResult.priceId} was created but currency rows could not be updated.`,
    };
  }

  const { error: insertError } = await service
    .from("stripe_student_product_currencies")
    .insert(
      currencyAmounts.map((row) => ({
        product_key: productKey,
        currency: row.currency,
        amount_minor: row.amountMinor,
        updated_at: now,
      })),
    );

  if (insertError) {
    console.error("[admin-stripe-pricing] currency insert", insertError);
    return {
      ok: false,
      error: `Stripe Price ${createResult.priceId} was created but currency rows could not be saved.`,
    };
  }

  revalidatePricingPaths();

  return {
    ok: true,
    message: `New Stripe Price created (${createResult.priceId}). Future checkouts will use this price. Existing subscriptions on older prices are unchanged.`,
  };
}
