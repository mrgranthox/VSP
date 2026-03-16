import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { billingController } from "./billing.controller";
import {
  BillingInvoicesQuery,
  BillingWebhookQuery,
  ConfirmPaymentIntentBody,
  CreatePaymentIntentBody,
  PaymentIntentIdParams
} from "./billing.schemas";

const billingRoutes = Router();

billingRoutes.post("/billing/payment-intents", authenticate, validate(CreatePaymentIntentBody), billingController.createPaymentIntent);
billingRoutes.get(
  "/billing/payment-intents/:paymentIntentId",
  authenticate,
  validate(PaymentIntentIdParams, "params"),
  billingController.getPaymentIntent
);
billingRoutes.post(
  "/billing/payment-intents/:paymentIntentId/confirm",
  authenticate,
  validate(PaymentIntentIdParams, "params"),
  validate(ConfirmPaymentIntentBody),
  billingController.confirmPaymentIntent
);
billingRoutes.post("/billing/webhooks/provider", validate(BillingWebhookQuery, "query"), billingController.handleProviderWebhook);
billingRoutes.get("/billing/subscriptions/me", authenticate, billingController.getMySubscription);
billingRoutes.get(
  "/billing/invoices/me",
  authenticate,
  validate(BillingInvoicesQuery, "query"),
  billingController.getMyInvoices
);

export { billingRoutes };
