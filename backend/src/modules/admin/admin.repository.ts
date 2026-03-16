import { AdminRoleKey, Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { ADMIN_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSION_KEYS, type AdminPermissionKey } from "./admin.permissions";

const ROLE_LABELS: Record<AdminRoleKey, string> = {
  MODERATOR: "Moderator",
  SUPPORT: "Support",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin"
};

const ROLE_DESCRIPTIONS: Record<AdminRoleKey, string> = {
  MODERATOR: "Moderation-focused admin access",
  SUPPORT: "Support operations access",
  ADMIN: "Broad operational admin access",
  SUPER_ADMIN: "Full system access"
};

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  USER_VIEW: "View users",
  USER_SUSPEND: "Suspend users",
  USER_REACTIVATE: "Reactivate users",
  WORKER_VIEW: "View workers",
  WORKER_VERIFY: "Approve worker verification",
  WORKER_REJECT_VERIFICATION: "Reject worker verification",
  POST_DELETE: "Delete posts",
  COMMENT_DELETE: "Delete comments",
  REVIEW_DELETE: "Delete reviews",
  REPORT_VIEW: "View reports",
  MODERATION_CASE_ASSIGN: "Assign moderation cases",
  MODERATION_CASE_ACTION: "Action moderation cases",
  SUPPORT_TICKET_VIEW: "View support tickets",
  SUPPORT_TICKET_ASSIGN: "Assign support tickets",
  SUPPORT_TICKET_RESPOND: "Respond to support tickets",
  AUDIT_LOG_VIEW: "View audit logs",
  ANALYTICS_VIEW_OVERVIEW: "View analytics overview",
  ANALYTICS_VIEW_SEARCH: "View search analytics",
  ANALYTICS_VIEW_ENGAGEMENT: "View engagement analytics",
  CONFIG_VIEW: "View system configs",
  CONFIG_UPDATE: "Update system configs",
  FEATURE_FLAG_VIEW: "View feature flags",
  FEATURE_FLAG_UPDATE: "Update feature flags",
  CITY_VIEW: "View city configs",
  CITY_CREATE: "Create city configs",
  CITY_UPDATE: "Update city configs",
  ROLE_VIEW: "View roles",
  PERMISSION_VIEW: "View permissions",
  ROLE_PERMISSION_UPDATE: "Update role permissions",
  ADMIN_ROLE_ASSIGN: "Assign admin roles",
  ADMIN_ROLE_REMOVE: "Remove admin roles",
  FULL_ACCESS: "Full access",
  SERVICE_REQUEST_VIEW: "View service requests",
  BOOKING_VIEW: "View bookings",
  FEATURED_WORKER_MANAGE: "Manage featured workers",
  FRAUD_SIGNAL_VIEW: "View fraud signals",
  FRAUD_SIGNAL_ACTION: "Action fraud signals",
  SYSTEM_HEALTH_VIEW: "View system health",
  CONTENT_VIEW: "View content entities",
  NOTIFICATION_BROADCAST: "Broadcast notifications",
  ANALYTICS_VIEW_MARKETPLACE: "View marketplace analytics"
};

const toJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

class AdminRepository {
  private catalogReady = false;

  async ensureCatalog(): Promise<void> {
    if (this.catalogReady) {
      return;
    }

    await prisma.$transaction(async (tx) => {
      for (const permissionKey of ADMIN_PERMISSION_KEYS) {
        await tx.adminPermission.upsert({
          where: { permissionKey },
          update: {
            description: PERMISSION_DESCRIPTIONS[permissionKey]
          },
          create: {
            permissionKey,
            description: PERMISSION_DESCRIPTIONS[permissionKey]
          }
        });
      }

      for (const roleKey of Object.values(AdminRoleKey)) {
        await tx.adminRole.upsert({
          where: { roleKey },
          update: {
            label: ROLE_LABELS[roleKey],
            description: ROLE_DESCRIPTIONS[roleKey]
          },
          create: {
            roleKey,
            label: ROLE_LABELS[roleKey],
            description: ROLE_DESCRIPTIONS[roleKey]
          }
        });
      }

      const [roles, permissions] = await Promise.all([
        tx.adminRole.findMany({
          select: {
            id: true,
            roleKey: true
          }
        }),
        tx.adminPermission.findMany({
          select: {
            id: true,
            permissionKey: true
          }
        })
      ]);

      const roleByKey = new Map(roles.map((role) => [role.roleKey, role]));
      const permissionByKey = new Map(permissions.map((permission) => [permission.permissionKey, permission]));

      for (const [roleKey, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSION_KEYS) as Array<[AdminRoleKey, string[]]>) {
        const role = roleByKey.get(roleKey);

        if (!role) {
          continue;
        }

        const existingCount = await tx.adminRolePermission.count({
          where: {
            roleId: role.id
          }
        });

        if (existingCount > 0) {
          continue;
        }

        const data = permissionKeys
          .map((permissionKey) => permissionByKey.get(permissionKey))
          .filter((permission): permission is { id: string; permissionKey: string } => Boolean(permission))
          .map((permission) => ({
            roleId: role.id,
            permissionId: permission.id
          }));

        if (data.length > 0) {
          await tx.adminRolePermission.createMany({
            data,
            skipDuplicates: true
          });
        }
      }
    });

    this.catalogReady = true;
  }

  async getUserPermissions(userId: string, roleKeys: string[] = []): Promise<string[]> {
    await this.ensureCatalog();

    if (roleKeys.includes(AdminRoleKey.SUPER_ADMIN)) {
      return ["FULL_ACCESS"];
    }

    const assignments = await prisma.adminUser.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    const permissionKeys = new Set<string>();

    for (const assignment of assignments) {
      for (const rolePermission of assignment.role.rolePermissions) {
        permissionKeys.add(rolePermission.permission.permissionKey);
      }
    }

    if (permissionKeys.size === 0) {
      for (const roleKey of roleKeys) {
        const defaults = DEFAULT_ROLE_PERMISSION_KEYS[roleKey as AdminRoleKey] ?? [];

        for (const permissionKey of defaults) {
          permissionKeys.add(permissionKey);
        }
      }
    }

    return Array.from(permissionKeys).sort();
  }

  async listRoles() {
    await this.ensureCatalog();

    return prisma.adminRole.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      },
      orderBy: {
        roleKey: "asc"
      }
    });
  }

  async listPermissions() {
    await this.ensureCatalog();

    return prisma.adminPermission.findMany({
      orderBy: {
        permissionKey: "asc"
      }
    });
  }

  async getRoleById(roleId: string) {
    await this.ensureCatalog();

    return prisma.adminRole.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });
  }

  async getRoleByKey(roleKey: AdminRoleKey) {
    await this.ensureCatalog();

    return prisma.adminRole.findUnique({
      where: { roleKey }
    });
  }

  async updateRolePermissions(roleId: string, permissionKeys: AdminPermissionKey[]): Promise<void> {
    await this.ensureCatalog();

    const permissions = await prisma.adminPermission.findMany({
      where: {
        permissionKey: {
          in: permissionKeys
        }
      },
      select: {
        id: true
      }
    });

    await prisma.$transaction(async (tx) => {
      await tx.adminRolePermission.deleteMany({
        where: {
          roleId
        }
      });

      if (permissions.length > 0) {
        await tx.adminRolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId,
            permissionId: permission.id
          })),
          skipDuplicates: true
        });
      }
    });
  }

  async assignRole(userId: string, roleKey: AdminRoleKey, assignedByUserId: string): Promise<void> {
    const role = await this.getRoleByKey(roleKey);

    if (!role) {
      return;
    }

    const existing = await prisma.adminUser.findFirst({
      where: {
        userId,
        roleId: role.id
      },
      select: {
        id: true
      }
    });

    if (existing) {
      return;
    }

    await prisma.adminUser.create({
      data: {
        userId,
        roleId: role.id,
        assignedByUserId
      }
    });
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    await prisma.adminUser.deleteMany({
      where: {
        userId,
        roleId
      }
    });
  }

  async writeAdminAuditLog(
    adminUserId: string,
    action: string,
    entityType?: string,
    entityId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action,
        entityType,
        entityId,
        metadataJson: metadata ? toJson(metadata) : undefined
      }
    });
  }
}

export { AdminRepository };
