import { z } from "zod";

const PaymentIntentIdParams = z.object({
  paymentIntentId: z.string().uuid()
});

const CreatePaymentIntentBody = z
  .object({
    type: z.enum(["FEATURED_SUBSCRIPTION", "BOOST"]),
    bookingId: z.string().uuid().optional(),
    durationDays: z.number().int().min(7).max(365).optional(),
    currencyCode: z.string().length(3).toUpperCase().optional()
  })
  .strict();

const ConfirmPaymentIntentBody = z
  .object({
    providerRef: z.string().min(1).max(255)
  })
  .strict();

const BillingWebhookQuery = z.object({
  provider: z.enum(["mock", "stripe", "paystack"]).default("mock")
});

const BillingInvoicesQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export {
  BillingInvoicesQuery,
  BillingWebhookQuery,
  ConfirmPaymentIntentBody,
  CreatePaymentIntentBody,
  PaymentIntentIdParams
};
