import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { InvoiceStatus, PaymentIntentStatus, SubscriptionStatus } from "@prisma/client";

import { EventBus } from "../../lib/eventBus";
import { Errors } from "../../lib/errors";
import { buildPagination, getPaginationArgs, type PaginationInput } from "../../lib/pagination";
import { redis } from "../../lib/redis";
import type { ActorContext } from "../../types/actor";
import { NotificationsService } from "../notifications/notifications.service";
import { BillingRepository } from "./billing.repository";

const DEFAULT_FEATURED_DURATION_DAYS = 30;
const DEFAULT_FEATURED_DAILY_PRICE_MINOR = 350;
const DEFAULT_BOOST_PRICE_MINOR = 2500;
const SUBSCRIPTION_EXPIRY_WARNING_DAYS = 7;

type ProviderWebhookEvent = {
  id?: string;
  type?: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getString = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value.trim() : undefined);

const safeSignatureCompare = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

class BillingService {
  constructor(
    private readonly repository: BillingRepository = new BillingRepository(),
    private readonly notificationsService: NotificationsService = new NotificationsService()
  ) {}

  private async getNumericConfig(configKey: string, fallback: number): Promise<number> {
    const config = await this.repository.getSystemConfig(configKey);
    const value = config?.valueJson;

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const candidate = (value as Record<string, unknown>).value;

      if (typeof candidate === "number" && Number.isFinite(candidate)) {
        return candidate;
      }
    }

    return fallback;
  }

  private async getCurrencyCode(input: string | undefined): Promise<string> {
    return (input ?? process.env.DEFAULT_CURRENCY_CODE ?? "USD").toUpperCase();
  }

  private getWebhookSecret(provider: string): string | null {
    switch (provider) {
      case "stripe":
        return process.env.STRIPE_WEBHOOK_SECRET ?? process.env.BILLING_WEBHOOK_SECRET ?? null;
      case "paystack":
        return process.env.PAYSTACK_WEBHOOK_SECRET ?? process.env.BILLING_WEBHOOK_SECRET ?? null;
      default:
        return process.env.BILLING_WEBHOOK_SECRET ?? null;
    }
  }

  private verifyWebhookSignature(provider: string, rawBody: Buffer, signature: string | undefined): void {
    const secret = this.getWebhookSecret(provider);

    if (!secret) {
      return;
    }

    if (!signature) {
      throw Errors.BILLING_WEBHOOK_INVALID_SIGNATURE();
    }

    const digest =
      provider === "paystack"
        ? createHmac("sha512", secret).update(rawBody).digest("hex")
        : createHmac("sha256", secret).update(rawBody).digest("hex");

    if (!safeSignatureCompare(digest, signature)) {
      throw Errors.BILLING_WEBHOOK_INVALID_SIGNATURE();
    }
  }

  private mapPaymentIntent(paymentIntent: Awaited<ReturnType<BillingRepository["getPaymentIntentById"]>>) {
    if (!paymentIntent) {
      return null;
    }

    return {
      id: paymentIntent.id,
      userId: paymentIntent.userId,
      bookingId: paymentIntent.bookingId,
      amountMinor: paymentIntent.amountMinor,
      currencyCode: paymentIntent.currencyCode,
      status: paymentIntent.status,
      providerRef: paymentIntent.providerRef,
      createdAt: paymentIntent.createdAt,
      fees: paymentIntent.platformFees.map((fee) => ({
        id: fee.id,
        feeMinor: fee.feeMinor,
        feeType: fee.feeType,
        createdAt: fee.createdAt
      })),
      featuredSubscriptions: paymentIntent.sourceSubscriptions.map((subscription) => ({
        id: subscription.id,
        workerProfileId: subscription.workerProfileId,
        startsAt: subscription.startsAt,
        endsAt: subscription.endsAt,
        status: subscription.status
      }))
    };
  }

  async createPaymentIntent(
    actor: ActorContext,
    data: {
      type: "FEATURED_SUBSCRIPTION" | "BOOST";
      bookingId?: string;
      durationDays?: number;
      currencyCode?: string;
    }
  ) {
    const currencyCode = await this.getCurrencyCode(data.currencyCode);

    if (data.type === "FEATURED_SUBSCRIPTION") {
      const workerProfile = await this.repository.getWorkerProfileByUserId(actor.userId);

      if (!workerProfile) {
        throw Errors.WORKER_PROFILE_NOT_FOUND();
      }

      const durationDays = data.durationDays ?? DEFAULT_FEATURED_DURATION_DAYS;
      const dailyPriceMinor = await this.getNumericConfig("featured_subscription_daily_price_minor", DEFAULT_FEATURED_DAILY_PRICE_MINOR);
      const amountMinor = dailyPriceMinor * durationDays;
      const paymentIntent = await this.repository.createPaymentIntent({
        userId: actor.userId,
        amountMinor,
        currencyCode
      });

      await Promise.all([
        this.repository.createPlatformFee(paymentIntent.id, amountMinor, "FEATURED_SUBSCRIPTION"),
        this.repository.createPendingFeaturedSubscription({
          workerProfileId: workerProfile.id,
          sourcePaymentIntentId: paymentIntent.id,
          startsAt: new Date(),
          endsAt: addDays(new Date(), durationDays)
        })
      ]);

      return this.mapPaymentIntent(await this.repository.getPaymentIntentById(paymentIntent.id));
    }

    if (data.bookingId) {
      const booking = await this.repository.getBookingForCustomer(data.bookingId, actor.userId);

      if (!booking) {
        throw Errors.BOOKING_NOT_FOUND();
      }
    }

    const amountMinor = await this.getNumericConfig("boost_price_minor", DEFAULT_BOOST_PRICE_MINOR);
    const paymentIntent = await this.repository.createPaymentIntent({
      userId: actor.userId,
      bookingId: data.bookingId,
      amountMinor,
      currencyCode
    });

    await this.repository.createPlatformFee(paymentIntent.id, amountMinor, "BOOST_FEE");

    return this.mapPaymentIntent(await this.repository.getPaymentIntentById(paymentIntent.id));
  }

  async getPaymentIntent(actor: ActorContext, paymentIntentId: string) {
    const paymentIntent = await this.repository.getPaymentIntentById(paymentIntentId);

    if (!paymentIntent || paymentIntent.userId !== actor.userId) {
      throw Errors.PAYMENT_INTENT_NOT_FOUND();
    }

    return this.mapPaymentIntent(paymentIntent);
  }

  async confirmPaymentIntent(actor: ActorContext, paymentIntentId: string, data: { providerRef: string }) {
    const paymentIntent = await this.repository.getPaymentIntentById(paymentIntentId);

    if (!paymentIntent || paymentIntent.userId !== actor.userId) {
      throw Errors.PAYMENT_INTENT_NOT_FOUND();
    }

    if (paymentIntent.status !== PaymentIntentStatus.CREATED && paymentIntent.status !== PaymentIntentStatus.PENDING) {
      throw Errors.PAYMENT_INTENT_INVALID_STATE();
    }

    const updated = await this.repository.updatePaymentIntent(paymentIntentId, {
      providerRef: data.providerRef,
      status: PaymentIntentStatus.PENDING
    });

    return this.mapPaymentIntent(updated);
  }

  async handleProviderWebhook(rawBody: Buffer, signature: string | undefined, provider: string): Promise<void> {
    if (!["mock", "stripe", "paystack"].includes(provider)) {
      throw Errors.BILLING_PROVIDER_UNSUPPORTED();
    }

    this.verifyWebhookSignature(provider, rawBody, signature);

    let event: ProviderWebhookEvent;

    try {
      event = JSON.parse(rawBody.toString("utf8")) as ProviderWebhookEvent;
    } catch {
      return;
    }

    const eventId = getString(event.id) ?? createHash("sha256").update(rawBody).digest("hex");
    const eventType = getString(event.type);

    if (!eventType) {
      return;
    }

    const requestHash = createHash("sha256").update(rawBody).digest("hex");
    const idempotencyKey = `${provider}:${eventId}:${eventType}`;
    const shouldProcess = await this.repository.ensureWebhookIdempotency(idempotencyKey, requestHash, addDays(new Date(), 7));

    if (!shouldProcess) {
      return;
    }

    const object = event.data?.object ?? {};
    const metadata = (object.metadata as Record<string, unknown> | undefined) ?? {};
    const paymentIntentId = getString(metadata.paymentIntentId) ?? getString(object.paymentIntentId);
    const providerRef = getString(object.providerRef) ?? getString(object.id);
    const paymentIntent = paymentIntentId
      ? await this.repository.getPaymentIntentById(paymentIntentId)
      : providerRef
        ? await this.repository.findPaymentIntentByProviderRef(providerRef)
        : null;

    if (!paymentIntent) {
      return;
    }

    if (eventType === "payment_intent.succeeded") {
      const updated = await this.repository.updatePaymentIntent(paymentIntent.id, {
        status: PaymentIntentStatus.SUCCEEDED,
        providerRef: providerRef ?? paymentIntent.providerRef
      });
      const subscriptions = await this.repository.getFeaturedSubscriptionsByPaymentIntent(paymentIntent.id);

      if (subscriptions.length > 0) {
        await this.repository.activateFeaturedSubscriptions(paymentIntent.id);

        for (const subscription of subscriptions) {
          await this.repository.setWorkerFeatured(subscription.workerProfileId, true);
          await this.repository.createSubscriptionInvoice({
            workerProfileId: subscription.workerProfileId,
            amountMinor: updated.amountMinor,
            currencyCode: updated.currencyCode,
            status: InvoiceStatus.PAID,
            providerRef: providerRef ?? updated.providerRef
          });
          await EventBus.emit("FEATURE_SUBSCRIPTION_STARTED", {
            workerProfileId: subscription.workerProfileId,
            subscriptionId: subscription.id,
            paymentIntentId: updated.id
          });
        }
      }

      return;
    }

    if (eventType === "payment_intent.payment_failed") {
      await this.repository.updatePaymentIntent(paymentIntent.id, {
        status: PaymentIntentStatus.FAILED,
        providerRef: providerRef ?? paymentIntent.providerRef
      });
      const subscriptions = await this.repository.getFeaturedSubscriptionsByPaymentIntent(paymentIntent.id);

      for (const subscription of subscriptions) {
        await this.repository.cancelFeaturedSubscriptions(paymentIntent.id);
        await this.repository.setWorkerFeatured(subscription.workerProfileId, false);
      }

      await this.notificationsService.createInAppNotification(paymentIntent.userId, "PAYMENT_FAILED", {
        paymentIntentId: paymentIntent.id,
        providerRef: providerRef ?? paymentIntent.providerRef
      });
      return;
    }

    if (eventType === "payment_intent.canceled") {
      await this.repository.updatePaymentIntent(paymentIntent.id, {
        status: PaymentIntentStatus.CANCELLED,
        providerRef: providerRef ?? paymentIntent.providerRef
      });
      const subscriptions = await this.repository.getFeaturedSubscriptionsByPaymentIntent(paymentIntent.id);

      for (const subscription of subscriptions) {
        await this.repository.cancelFeaturedSubscriptions(paymentIntent.id);
        await this.repository.setWorkerFeatured(subscription.workerProfileId, false);
      }

      return;
    }

    if (eventType === "charge.refunded") {
      await this.repository.updatePaymentIntent(paymentIntent.id, {
        status: PaymentIntentStatus.REFUNDED,
        providerRef: providerRef ?? paymentIntent.providerRef
      });
      const subscriptions = await this.repository.getFeaturedSubscriptionsByPaymentIntent(paymentIntent.id);

      for (const subscription of subscriptions) {
        await this.repository.cancelFeaturedSubscriptions(paymentIntent.id, SubscriptionStatus.CANCELLED);
        await this.repository.setWorkerFeatured(subscription.workerProfileId, false);
      }
    }
  }

  async getMySubscription(actor: ActorContext) {
    const workerProfile = await this.repository.getWorkerProfileByUserId(actor.userId);

    if (!workerProfile) {
      return {
        subscription: null,
        isActive: false
      };
    }

    const subscription =
      (await this.repository.getCurrentActiveSubscription(workerProfile.id)) ?? (await this.repository.getLatestSubscription(workerProfile.id));

    return {
      subscription,
      isActive: Boolean(subscription && subscription.status === SubscriptionStatus.ACTIVE && subscription.endsAt > new Date())
    };
  }

  async getMyInvoices(actor: ActorContext, pagination: PaginationInput) {
    const workerProfile = await this.repository.getWorkerProfileByUserId(actor.userId);

    if (!workerProfile) {
      return {
        data: [],
        pagination: buildPagination(pagination.page, pagination.limit, 0)
      };
    }

    const args = getPaginationArgs(pagination);
    const [items, total] = await Promise.all([
      this.repository.listInvoices(workerProfile.id, args.skip, args.take),
      this.repository.countInvoices(workerProfile.id)
    ]);

    return {
      data: items,
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async expireSubscriptions(): Promise<number> {
    const subscriptions = await this.repository.findExpirableSubscriptions(new Date());

    for (const subscription of subscriptions) {
      await this.repository.expireSubscription(subscription.id);
      await this.repository.setWorkerFeatured(subscription.workerProfileId, false);
      await this.notificationsService.createInAppNotification(subscription.workerProfile.userId, "FEATURE_SUBSCRIPTION_EXPIRED", {
        subscriptionId: subscription.id,
        workerProfileId: subscription.workerProfileId,
        endedAt: subscription.endsAt.toISOString()
      });
    }

    return subscriptions.length;
  }

  async sendExpiryWarnings(): Promise<number> {
    const subscriptions = await this.repository.findSubscriptionsExpiringBefore(addDays(new Date(), SUBSCRIPTION_EXPIRY_WARNING_DAYS));
    let sentCount = 0;

    for (const subscription of subscriptions) {
      const warningKey = `billing:feature-warning:${subscription.id}`;
      const alreadySent = await redis.get(warningKey);

      if (alreadySent) {
        continue;
      }

      await this.notificationsService.createInAppNotification(subscription.workerProfile.userId, "FEATURED_EXPIRING", {
        subscriptionId: subscription.id,
        workerProfileId: subscription.workerProfileId,
        endsAt: subscription.endsAt.toISOString()
      });
      await redis.set(warningKey, "1", "EX", Math.max(3600, Math.floor((subscription.endsAt.getTime() - Date.now()) / 1000)));
      sentCount += 1;
    }

    return sentCount;
  }
}

export { BillingService };
