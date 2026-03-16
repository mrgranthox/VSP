import { Prisma, type NotificationChannel } from "@prisma/client";

import { prisma } from "../../lib/prisma";

const userProfileSelect = {
  firstName: true,
  lastName: true,
  displayName: true,
  avatarUrl: true
} as const;

class NotificationsRepository {
  async listNotifications(
    userId: string,
    filters: { isRead?: boolean; channel?: NotificationChannel },
    skip: number,
    take: number
  ) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(filters.isRead !== undefined ? { isRead: filters.isRead } : {}),
        ...(filters.channel ? { channel: filters.channel } : {})
      },
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take
    });
  }

  async countNotifications(userId: string, filters: { isRead?: boolean; channel?: NotificationChannel }): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        ...(filters.isRead !== undefined ? { isRead: filters.isRead } : {}),
        ...(filters.channel ? { channel: filters.channel } : {})
      }
    });
  }

  async countUnreadNotifications(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });
  }

  async getNotificationById(userId: string, notificationId: string) {
    return prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId
      }
    });
  }

  async markNotificationRead(notificationId: string) {
    return prisma.notification.update({
      where: {
        id: notificationId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }

  async markAllNotificationsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }

  async ensureNotificationPreference(userId: string) {
    return prisma.notificationPreference.upsert({
      where: {
        userId
      },
      create: {
        userId
      },
      update: {}
    });
  }

  async updateNotificationPreference(
    userId: string,
    data: Partial<{
      chatPushEnabled: boolean;
      requestPushEnabled: boolean;
      marketingEmailEnabled: boolean;
      quietHoursStart: number | null;
      quietHoursEnd: number | null;
    }>
  ) {
    return prisma.notificationPreference.upsert({
      where: {
        userId
      },
      create: {
        userId,
        ...data
      },
      update: data
    });
  }

  async registerPushDevice(userId: string, data: { deviceToken: string; platform: string }) {
    return prisma.pushDevice.upsert({
      where: {
        deviceToken: data.deviceToken
      },
      create: {
        userId,
        deviceToken: data.deviceToken,
        platform: data.platform
      },
      update: {
        userId,
        platform: data.platform
      }
    });
  }

  async getPushDevice(userId: string, deviceId: string) {
    return prisma.pushDevice.findFirst({
      where: {
        id: deviceId,
        userId
      }
    });
  }

  async deletePushDevice(deviceId: string): Promise<void> {
    await prisma.pushDevice.delete({
      where: {
        id: deviceId
      }
    });
  }

  async createNotification(data: {
    userId: string;
    channel?: NotificationChannel;
    notificationType: string;
    payloadJson: Prisma.InputJsonValue;
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        channel: data.channel,
        notificationType: data.notificationType,
        payloadJson: data.payloadJson
      }
    });
  }

  async getBookingContext(bookingId: string) {
    return prisma.booking.findUnique({
      where: {
        id: bookingId
      },
      select: {
        id: true,
        customerUserId: true,
        scheduledStart: true,
        workerProfile: {
          select: {
            userId: true,
            user: {
              select: {
                profile: {
                  select: userProfileSelect
                }
              }
            }
          }
        },
        serviceRequest: {
          select: {
            tradeCategory: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
  }

  async getRescheduleContext(rescheduleId: string) {
    return prisma.bookingReschedule.findUnique({
      where: {
        id: rescheduleId
      },
      select: {
        id: true,
        bookingId: true,
        requestedByUserId: true,
        newStart: true,
        newEnd: true,
        requestedByUser: {
          select: {
            profile: {
              select: userProfileSelect
            }
          }
        },
        booking: {
          select: {
            customerUserId: true,
            workerProfile: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });
  }

  async getMessageContext(messageId: string) {
    return prisma.message.findUnique({
      where: {
        id: messageId
      },
      select: {
        id: true,
        conversationId: true,
        messageType: true,
        body: true,
        sender: {
          select: {
            profile: {
              select: userProfileSelect
            }
          }
        }
      }
    });
  }

  async getAssignmentContext(assignmentId: string) {
    return prisma.serviceRequestAssignment.findUnique({
      where: {
        id: assignmentId
      },
      select: {
        id: true,
        workerProfile: {
          select: {
            userId: true
          }
        },
        serviceRequest: {
          select: {
            id: true,
            title: true,
            tradeCategory: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
  }

  async getReviewContext(reviewId: string) {
    return prisma.review.findUnique({
      where: {
        id: reviewId
      },
      select: {
        id: true,
        rating: true,
        body: true,
        revieweeUserId: true,
        reviewerUser: {
          select: {
            profile: {
              select: userProfileSelect
            }
          }
        }
      }
    });
  }
}

export { NotificationsRepository };
