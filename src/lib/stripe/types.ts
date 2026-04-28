export type StripePaymentTarget = {
  paymentIntentId?: string;
  chargeId?: string;
};

export type StripeSafePaymentSnapshot = StripePaymentTarget & {
  amountMinor: number;
  amountRefundedMinor: number;
  currency: string;
  status: string;
  customerId?: string;
  livemode: false;
  created: number;
};

export type StripeSafeRefundSnapshot = StripePaymentTarget & {
  refundId: string;
  amountMinor: number;
  currency: string;
  status: string;
  livemode: false;
  created: number;
};
