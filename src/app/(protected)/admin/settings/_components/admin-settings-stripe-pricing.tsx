"use client";

import { updateStripeStudentProductPricing } from "@/actions/admin-stripe-pricing";
import { AdminControl } from "@/app/(protected)/admin/_components/admin-control";
import {
  STRIPE_STUDENT_PRODUCT_KEYS,
  SUPPORTED_CURRENCIES,
  STRIPE_STUDENT_PRODUCT_DESCRIPTIONS,
  amountInputStep,
  minorToMajor,
  type StripeStudentProductKey,
  type StripeStudentProductPricing,
} from "@/lib/stripe/stripe-student-pricing-shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

const readOnlyClassName =
  "w-full rounded-[8px] border border-[#eceae6] bg-[#faf9f7] px-3 py-2 text-[13px] text-[#4a4a4a]";

const sectionClassName =
  "rounded-[12px] border border-[#e8e6e2] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)]";

const PRODUCT_DESCRIPTIONS = STRIPE_STUDENT_PRODUCT_DESCRIPTIONS;

function amountStep(currency: (typeof SUPPORTED_CURRENCIES)[number]): string {
  return amountInputStep(currency);
}

function ProductPricingCard({ product }: { product: StripeStudentProductPricing }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const amountByCurrency = new Map(
    product.currencies.map((row) => [row.currency, row.amountMinor]),
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const result = await updateStripeStudentProductPricing(new FormData(event.currentTarget));
    if (!result.ok) {
      setError(result.error);
    } else {
      if (result.message) {
        setMessage(result.message);
      }
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[10px] border border-[#eceae6] p-4">
      <input type="hidden" name="productKey" value={product.productKey} />

      <div>
        <h3 className="text-[14px] font-bold text-[#1a1a1a]">{product.label}</h3>
        <p className="mt-1 text-[12px] text-[#888]">
          {PRODUCT_DESCRIPTIONS[product.productKey]}
        </p>
        {product.updatedAt ? (
          <p className="mt-1 text-[11px] text-[#aaa]">
            Last updated {new Date(product.updatedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className={labelClassName}>Stripe Product ID</p>
          <p className={readOnlyClassName}>
            <code>{product.stripeProductId}</code>
          </p>
        </div>
        <div>
          <p className={labelClassName}>Active Stripe Price ID</p>
          <p className={readOnlyClassName}>
            {product.stripePriceId ? (
              <code>{product.stripePriceId}</code>
            ) : (
              <span className="text-[#888]">None — created on first save</span>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SUPPORTED_CURRENCIES.map((currency) => {
          const amountMinor = amountByCurrency.get(currency);
          const defaultMajor =
            amountMinor != null ? minorToMajor(currency, amountMinor) : "";

          return (
            <div key={currency}>
              <label
                htmlFor={`${product.productKey}-${currency}`}
                className={labelClassName}
              >
                {currency}
              </label>
              <input
                id={`${product.productKey}-${currency}`}
                name={`amount_${currency}`}
                type="number"
                min={0}
                step={amountStep(currency)}
                defaultValue={defaultMajor === "" ? "" : defaultMajor}
                className={inputClassName}
                placeholder="Optional"
              />
            </div>
          );
        })}
      </div>

      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      {message ? <p className="text-[13px] text-[#2D6A4F]">{message}</p> : null}

      <AdminControl permission="edit_system_plans">
        <button
          type="submit"
          disabled={saving}
          className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save pricing"}
        </button>
      </AdminControl>
    </form>
  );
}

export function AdminSettingsStripePricing({
  products,
}: {
  products: Record<StripeStudentProductKey, StripeStudentProductPricing>;
}) {
  return (
    <section className={sectionClassName}>
      <div className="mb-4">
        <h2 className="text-[15px] font-bold text-[#1a1a1a]">Stripe student pricing</h2>
        <p className="mt-1 text-[12px] text-[#888]">
          Configure amounts per currency for each student product. Saving creates a new Stripe
          Price under the fixed Product above. Future checkouts use the new Price; existing
          subscriptions on older Prices are unchanged.
        </p>
      </div>

      <div className="space-y-5">
        {STRIPE_STUDENT_PRODUCT_KEYS.map((productKey) => (
          <ProductPricingCard key={productKey} product={products[productKey]} />
        ))}
      </div>
    </section>
  );
}
