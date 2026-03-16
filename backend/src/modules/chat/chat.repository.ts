import { ConversationType, UserStatus, type MessageType } from "@prisma/client";

import { prisma } from "../../lib/prisma";

const participantInclude = {
  user: {
    select: {
      id: true,
      status: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true
        }
      }
    }
  }
} as const;

const messageInclude = {
  sender: {
    select: {
      id: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true
        }
      }
    }
  },
  attachments: {
    orderBy: {
      createdAt: "asc"
    }
  }
} as const;

const conversationInclude = {
  participants: {
    include: participantInclude,
    orderBy: {
      joinedAt: "asc"
    }
  },
  messages: {
    include: messageInclude,
    orderBy: {
      createdAt: "desc"
    },
    take: 1
  }
} as const;

class ChatRepository {
  async findUsersByIds(userIds: string[]) {
    return prisma.user.findMany({
      where: {
        id: {
          in: userIds
        },
        status: UserStatus.ACTIVE
      },
      select: {
        id: true
      }
    });
  }

  async getServiceRequestConversationAccess(serviceRequestId: string) {
    return prisma.serviceRequest.findUnique({
      where: {
        id: serviceRequestId
      },
      select: {
        id: true,
        customerUserId: true,
        preferredWorkerProfile: {
          select: {
            userId: true
          }
        },
        assignments: {
          select: {
            workerProfile: {
              select: {
                userId: true
              }
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

  async findConversationByParticipantSet(params: {
    type: ConversationType;
    participantUserIds: string[];
    serviceRequestId?: string;
  }) {
    const conversations = await prisma.conversation.findMany({
      where: {
        conversationType: params.type,
        ...(params.serviceRequestId !== undefined ? { serviceRequestId: params.serviceRequestId } : {}),
        participants: {
          some: {
            userId: {
              in: params.participantUserIds
            }
          }
        }
      },
      include: conversationInclude
    });

    const sortedParticipantIds = [...params.participantUserIds].sort();

    return (
      conversations.find((conversation) => {
        const conversationParticipantIds = conversation.participants.map((participant) => participant.userId).sort();

        return (
          conversationParticipantIds.length === sortedParticipantIds.length &&
          conversationParticipantIds.every((participantId, index) => participantId === sortedParticipantIds[index])
        );
      }) ?? null
    );
  }

  async createConversation(data: {
    type: ConversationType;
    participantUserIds: string[];
    serviceRequestId?: string;
  }) {
    return prisma.conversation.create({
      data: {
        conversationType: data.type,
        serviceRequestId: data.serviceRequestId,
        participants: {
          create: data.participantUserIds.map((userId) => ({
            userId
          }))
        }
      },
      include: conversationInclude
    });
  }

  async countConversations(userId: string): Promise<number> {
    return prisma.conversation.count({
      where: {
        participants: {
          some: {
            userId
          }
        }
      }
    });
  }

  async listConversations(userId: string, skip: number, take: number) {
    return prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId
          }
        }
      },
      include: conversationInclude,
      orderBy: {
        updatedAt: "desc"
      },
      skip,
      take
    });
  }

  async getConversationById(conversationId: string) {
    return prisma.conversation.findUnique({
      where: {
        id: conversationId
      },
      include: conversationInclude
    });
  }

  async getConversationParticipant(conversationId: string, userId: string) {
    return prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      }
    });
  }

  async isParticipant(userId: string, conversationId: string): Promise<boolean> {
    const participant = await this.getConversationParticipant(conversationId, userId);
    return Boolean(participant);
  }

  async addParticipant(conversationId: string, userId: string): Promise<void> {
    await prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      },
      create: {
        conversationId,
        userId
      },
      update: {}
    });
  }

  async removeParticipant(conversationId: string, userId: string): Promise<void> {
    await prisma.conversationParticipant.deleteMany({
      where: {
        conversationId,
        userId
      }
    });
  }

  async touchConversation(conversationId: string): Promise<void> {
    await prisma.conversation.update({
      where: {
        id: conversationId
      },
      data: {
        updatedAt: new Date()
      }
    });
  }

  async getMessageById(messageId: string) {
    return prisma.message.findUnique({
      where: {
        id: messageId
      },
      include: {
        ...messageInclude,
        conversation: {
          include: {
            participants: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });
  }

  async getConversationMessage(conversationId: string, messageId: string) {
    return prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId
      },
      include: {
        ...messageInclude,
        conversation: {
          include: {
            participants: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });
  }

  async countMessages(
    conversationId: string,
    options: {
      beforeCreatedAt?: Date;
      afterCreatedAt?: Date;
    }
  ): Promise<number> {
    return prisma.message.count({
      where: {
        conversationId,
        ...(options.beforeCreatedAt
          ? {
              createdAt: {
                lt: options.beforeCreatedAt
              }
            }
          : {}),
        ...(options.afterCreatedAt
          ? {
              createdAt: {
                gt: options.afterCreatedAt
              }
            }
          : {})
      }
    });
  }

  async listMessages(
    conversationId: string,
    options: {
      skip: number;
      take: number;
      beforeCreatedAt?: Date;
      afterCreatedAt?: Date;
    }
  ) {
    return prisma.message.findMany({
      where: {
        conversationId,
        ...(options.beforeCreatedAt
          ? {
              createdAt: {
                lt: options.beforeCreatedAt
              }
            }
          : {}),
        ...(options.afterCreatedAt
          ? {
              createdAt: {
                gt: options.afterCreatedAt
              }
            }
          : {})
      },
      include: messageInclude,
      orderBy: {
        createdAt: options.afterCreatedAt ? "asc" : "desc"
      },
      skip: options.skip,
      take: options.take
    });
  }

  async createMessage(data: {
    conversationId: string;
    senderId: string;
    messageType: MessageType;
    body: string | null;
    attachments: Array<{ mediaAssetId?: string; fileUrl: string; mimeType: string; sizeBytes: bigint | null }>;
  }) {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId: data.conversationId,
          senderId: data.senderId,
          messageType: data.messageType,
          body: data.body,
          attachments: data.attachments.length
            ? {
                create: data.attachments
              }
            : undefined
        },
        include: messageInclude
      });

      await tx.conversation.update({
        where: {
          id: data.conversationId
        },
        data: {
          updatedAt: new Date()
        }
      });

      return message;
    });
  }

  async addMessageAttachment(messageId: string, data: { mediaAssetId?: string; fileUrl: string; mimeType: string; sizeBytes: bigint | null }) {
    return prisma.messageAttachment.create({
      data: {
        messageId,
        mediaAssetId: data.mediaAssetId,
        fileUrl: data.fileUrl,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes
      }
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.message.count({
      where: {
        senderId: {
          not: userId
        },
        conversation: {
          participants: {
            some: {
              userId
            }
          }
        },
        reads: {
          none: {
            userId
          }
        }
      }
    });
  }

  async getUnreadMessageIdsUpTo(conversationId: string, userId: string, lastReadCreatedAt: Date) {
    return prisma.message.findMany({
      where: {
        conversationId,
        senderId: {
          not: userId
        },
        createdAt: {
          lte: lastReadCreatedAt
        },
        reads: {
          none: {
            userId
          }
        }
      },
      select: {
        id: true
      }
    });
  }

  async markMessagesRead(conversationId: string, userId: string, messageIds: string[], lastReadMessageId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      if (messageIds.length > 0) {
        await tx.messageRead.createMany({
          data: messageIds.map((messageId) => ({
            messageId,
            userId
          })),
          skipDuplicates: true
        });
      }

      await tx.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId
          }
        },
        data: {
          lastReadMessageId
        }
      });
    });
  }
}

export { ChatRepository };
