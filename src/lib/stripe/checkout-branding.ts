import "server-only";

import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";
import type Stripe from "stripe";

/** App design tokens aligned with landing-page.css and payment checkout. */
export const UNIVEERA_CHECKOUT_COLORS = {
  background: "#faf9f7",
  button: "#2D6A4F",
  displayName: "Univeera",
} as const;

export async function buildHostedCheckoutBrandingSettings(): Promise<
  Stripe.Checkout.SessionCreateParams.BrandingSettings
> {
  const baseUrl = await getPublicSiteBaseUrl();

  return {
    display_name: UNIVEERA_CHECKOUT_COLORS.displayName,
    background_color: UNIVEERA_CHECKOUT_COLORS.background,
    button_color: UNIVEERA_CHECKOUT_COLORS.button,
    border_style: "rounded",
    font_family: "inter",
    icon: {
      type: "url",
      url: `${baseUrl}/brand/univeera-icon.svg`,
    },
    logo: {
      type: "url",
      url: `${baseUrl}/brand/univeera-logo.svg`,
    },
  };
}
