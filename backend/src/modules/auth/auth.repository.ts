import type { AdminRoleKey, Prisma, UserStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";

type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    adminAssignments: {
      include: {
        role: true;
      };
    };
  };
}>;

type UserWithRolesAndProfile = Prisma.UserGetPayload<{
  include: {
    profile: true;
    adminAssignments: {
      include: {
        role: true;
      };
    };
  };
}>;

type UserWithRolesAndMfa = Prisma.UserGetPayload<{
  include: {
    mfaConfig: true;
    adminAssignments: {
      include: {
        role: true;
      };
    };
  };
}>;

type SessionWithUser = Prisma.UserSessionGetPayload<{
  include: {
    user: {
      include: {
        mfaConfig: true;
        adminAssignments: {
          include: {
            role: true;
          };
        };
      };
    };
  };
}>;

interface CreateUserInput {
  email?: string;
  phone?: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
}

interface CreateSessionInput {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceType?: string;
  ipAddress?: string;
  mfaVerified?: boolean;
  mfaMethod?: string | null;
  expiresAt: Date;
}

interface UpsertMfaConfigInput {
  userId: string;
  method: string;
  totpSecretCiphertext?: string | null;
  backupCodeHashes: string[];
  backupCodeCiphertexts: string[];
}

class AuthRepository {
  async findUserByEmail(email: string): Promise<UserWithRoles | null> {
    return prisma.user.findUnique({
      where: { email },
      include: {
        adminAssignments: {
          include: { role: true }
        }
      }
    });
  }

  async findUserByPhone(phone: string): Promise<UserWithRoles | null> {
    return prisma.user.findUnique({
      where: { phone },
      include: {
        adminAssignments: {
          include: { role: true }
        }
      }
    });
  }

  async findUserByIdentifier(identifier: { email?: string; phone?: string }): Promise<UserWithRoles | null> {
    if (identifier.email) {
      return this.findUserByEmail(identifier.email);
    }

    if (identifier.phone) {
      return this.findUserByPhone(identifier.phone);
    }

    return null;
  }

  async createUserWithProfile(input: CreateUserInput): Promise<UserWithRolesAndProfile> {
    return prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash: input.passwordHash,
        profile: {
          create: {
            firstName: input.firstName,
            lastName: input.lastName
          }
        }
      },
      include: {
        profile: true,
        adminAssignments: {
          include: { role: true }
        }
      }
    });
  }

  async createSession(input: CreateSessionInput) {
    return prisma.userSession.create({
      data: {
        id: input.id,
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        deviceType: input.deviceType,
        ipAddress: input.ipAddress,
        mfaVerified: input.mfaVerified ?? false,
        mfaMethod: input.mfaMethod ?? null,
        expiresAt: input.expiresAt
      }
    });
  }

  async updateLastLoginAt(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    });
  }

  async getUserWithRoles(userId: string): Promise<UserWithRoles | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        adminAssignments: {
          include: { role: true }
        }
      }
    });
  }

  async getUserWithRolesAndMfa(userId: string): Promise<UserWithRolesAndMfa | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        mfaConfig: true,
        adminAssignments: {
          include: { role: true }
        }
      }
    });
  }

  async findSessionByRefreshTokenHash(refreshTokenHash: string): Promise<SessionWithUser | null> {
    return prisma.userSession.findFirst({
      where: { refreshTokenHash },
      include: {
        user: {
          include: {
            mfaConfig: true,
            adminAssignments: {
              include: { role: true }
            }
          }
        }
      }
    });
  }

  async revokeSessionForUser(sessionId: string, userId: string): Promise<boolean> {
    const result = await prisma.userSession.updateMany({
      where: {
        id: sessionId,
        userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    return result.count > 0;
  }

  async revokeAllSessionsForUser(userId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: {
        userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  }

  async rotateSession(previousSessionId: string, nextSession: CreateSessionInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.userSession.update({
        where: { id: previousSessionId },
        data: { revokedAt: new Date() }
      });

      await tx.userSession.create({
        data: {
          id: nextSession.id,
          userId: nextSession.userId,
          refreshTokenHash: nextSession.refreshTokenHash,
          deviceType: nextSession.deviceType,
          ipAddress: nextSession.ipAddress,
          mfaVerified: nextSession.mfaVerified ?? false,
          mfaMethod: nextSession.mfaMethod ?? null,
          expiresAt: nextSession.expiresAt
        }
      });
    });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true }
    });
  }

  async markPhoneVerified(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isPhoneVerified: true }
    });
  }

  async updatePasswordAndRevokeSessions(userId: string, passwordHash: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash }
      });

      await tx.userSession.updateMany({
        where: {
          userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    });
  }

  async upsertMfaConfig(input: UpsertMfaConfigInput) {
    return prisma.userMfaConfig.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        method: input.method,
        totpSecretCiphertext: input.totpSecretCiphertext ?? null,
        backupCodeHashes: input.backupCodeHashes,
        backupCodeCiphertexts: input.backupCodeCiphertexts
      },
      update: {
        method: input.method,
        totpSecretCiphertext: input.totpSecretCiphertext ?? null,
        backupCodeHashes: input.backupCodeHashes,
        backupCodeCiphertexts: input.backupCodeCiphertexts
      }
    });
  }

  async deleteMfaConfig(userId: string): Promise<void> {
    await prisma.userMfaConfig.deleteMany({
      where: { userId }
    });
  }

  async markSessionMfaVerified(sessionId: string, userId: string, method: string): Promise<boolean> {
    const result = await prisma.userSession.updateMany({
      where: {
        id: sessionId,
        userId,
        revokedAt: null
      },
      data: {
        mfaVerified: true,
        mfaMethod: method
      }
    });

    return result.count > 0;
  }

  async clearSessionMfaVerified(sessionId: string, userId: string): Promise<boolean> {
    const result = await prisma.userSession.updateMany({
      where: {
        id: sessionId,
        userId,
        revokedAt: null
      },
      data: {
        mfaVerified: false,
        mfaMethod: null
      }
    });

    return result.count > 0;
  }

  getRoles(user: UserWithRoles | UserWithRolesAndProfile | UserWithRolesAndMfa | SessionWithUser["user"]): AdminRoleKey[] {
    return user.adminAssignments.map((assignment) => assignment.role.roleKey);
  }

  getUserStatus(user: UserWithRoles | UserWithRolesAndMfa | SessionWithUser["user"]): UserStatus {
    return user.status;
  }
}

export { AuthRepository };
export type { CreateSessionInput, SessionWithUser, UpsertMfaConfigInput, UserWithRoles, UserWithRolesAndMfa, UserWithRolesAndProfile };
