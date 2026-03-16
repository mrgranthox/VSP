import { InvoiceStatus, PaymentIntentStatus, Prisma, SubscriptionStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";

class BillingRepository {
  async getSystemConfig(configKey: string) {
    return prisma.systemConfig.findUnique({
      where: { configKey }
    });
  }

  async getWorkerProfileByUserId(userId: string) {
    return prisma.workerProfile.findUnique({
      where: { userId }
    });
  }

  async getBookingForCustomer(bookingId: string, userId: string) {
    return prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerUserId: userId
      }
    });
  }

  async createPaymentIntent(data: {
    userId: string;
    bookingId?: string;
    amountMinor: number;
    currencyCode: string;
    status?: PaymentIntentStatus;
  }) {
    return prisma.paymentIntent.create({
      data: {
        userId: data.userId,
        bookingId: data.bookingId,
        amountMinor: data.amountMinor,
        currencyCode: data.currencyCode,
        status: data.status ?? PaymentIntentStatus.CREATED
      }
    });
  }

  async createPlatformFee(paymentIntentId: string, feeMinor: number, feeType: string) {
    return prisma.platformFee.create({
      data: {
        paymentIntentId,
        feeMinor,
        feeType
      }
    });
  }

  async createPendingFeaturedSubscription(data: {
    workerProfileId: string;
    sourcePaymentIntentId: string;
    startsAt: Date;
    endsAt: Date;
  }) {
    return prisma.workerFeaturedSubscription.create({
      data: {
        workerProfileId: data.workerProfileId,
        sourcePaymentIntentId: data.sourcePaymentIntentId,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        status: SubscriptionStatus.PENDING
      }
    });
  }

  async getPaymentIntentById(paymentIntentId: string) {
    return prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      include: {
        platformFees: true,
        sourceSubscriptions: true,
        booking: true
      }
    });
  }

  async updatePaymentIntent(paymentIntentId: string, data: Prisma.PaymentIntentUpdateInput) {
    return prisma.paymentIntent.update({
      where: { id: paymentIntentId },
      data,
      include: {
        platformFees: true,
        sourceSubscriptions: true,
        booking: true
      }
    });
  }

  async findPaymentIntentByProviderRef(providerRef: string) {
    return prisma.paymentIntent.findFirst({
      where: { providerRef },
      include: {
        platformFees: true,
        sourceSubscriptions: true
      }
    });
  }

  async ensureWebhookIdempotency(idempotencyKey: string, requestHash: string, expiresAt: Date): Promise<boolean> {
    try {
      await prisma.apiIdempotencyKey.create({
        data: {
          idempotencyKey,
          requestHash,
          expiresAt
        }
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return false;
      }

      throw error;
    }
  }

  async activateFeaturedSubscriptions(paymentIntentId: string) {
    const updated = await prisma.workerFeaturedSubscription.updateMany({
      where: {
        sourcePaymentIntentId: paymentIntentId
      },
      data: {
        status: SubscriptionStatus.ACTIVE
      }
    });

    return updated.count;
  }

  async cancelFeaturedSubscriptions(paymentIntentId: string, status: SubscriptionStatus = SubscriptionStatus.CANCELLED) {
    const updated = await prisma.workerFeaturedSubscription.updateMany({
      where: {
        sourcePaymentIntentId: paymentIntentId
      },
      data: {
        status
      }
    });

    return updated.count;
  }

  async getFeaturedSubscriptionsByPaymentIntent(paymentIntentId: string) {
    return prisma.workerFeaturedSubscription.findMany({
      where: {
        sourcePaymentIntentId: paymentIntentId
      }
    });
  }

  async setWorkerFeatured(workerProfileId: string, isFeatured: boolean) {
    return prisma.workerProfile.update({
      where: { id: workerProfileId },
      data: {
        isFeatured
      }
    });
  }

  async createSubscriptionInvoice(data: {
    workerProfileId: string;
    amountMinor: number;
    currencyCode: string;
    status: InvoiceStatus;
    providerRef?: string | null;
  }) {
    return prisma.workerSubscriptionInvoice.create({
      data: {
        workerProfileId: data.workerProfileId,
        amountMinor: data.amountMinor,
        currencyCode: data.currencyCode,
        status: data.status,
        providerRef: data.providerRef ?? null
      }
    });
  }

  async getLatestSubscription(workerProfileId: string) {
    return prisma.workerFeaturedSubscription.findFirst({
      where: { workerProfileId },
      orderBy: [{ status: "asc" }, { endsAt: "desc" }]
    });
  }

  async getCurrentActiveSubscription(workerProfileId: string) {
    return prisma.workerFeaturedSubscription.findFirst({
      where: {
        workerProfileId,
        status: SubscriptionStatus.ACTIVE
      },
      orderBy: {
        endsAt: "desc"
      }
    });
  }

  async countInvoices(workerProfileId: string) {
    return prisma.workerSubscriptionInvoice.count({
      where: { workerProfileId }
    });
  }

  async listInvoices(workerProfileId: string, skip: number, take: number) {
    return prisma.workerSubscriptionInvoice.findMany({
      where: { workerProfileId },
      orderBy: { createdAt: "desc" },
      skip,
      take
    });
  }

  async findExpirableSubscriptions(now: Date) {
    return prisma.workerFeaturedSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endsAt: {
          lt: now
        }
      },
      include: {
        workerProfile: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    });
  }

  async findSubscriptionsExpiringBefore(date: Date) {
    return prisma.workerFeaturedSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endsAt: {
          lte: date
        }
      },
      include: {
        workerProfile: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    });
  }

  async expireSubscription(subscriptionId: string) {
    return prisma.workerFeaturedSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.EXPIRED
      }
    });
  }
}

export { BillingRepository };
