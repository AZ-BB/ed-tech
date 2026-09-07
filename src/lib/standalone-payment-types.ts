export type StandaloneCheckoutMode = "custom" | "hosted";

export type StandalonePaymentLinkInput = {
  amountAed: number;
  checkoutMode?: StandaloneCheckoutMode;
};
