import { type NextFunction, type Request, type Response } from "express";

import { Errors } from "../../lib/errors";
import { assertFreshMfa } from "../../middleware/requireMfa";
import { DANGEROUS_ADMIN_PERMISSIONS } from "./admin.permissions";
import { AdminRepository } from "./admin.repository";

const repository = new AdminRepository();

const requirePermission = (permissionKey: string) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const permissions = await repository.getUserPermissions(req.actor.userId, req.actor.roles ?? []);
    req.actor.permissions = permissions;

    if (!permissions.includes("FULL_ACCESS") && !permissions.includes(permissionKey)) {
      throw Errors.PERMISSION_DENIED();
    }

    if (!["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase()) && DANGEROUS_ADMIN_PERMISSIONS.has(permissionKey)) {
      assertFreshMfa(req.actor);
    }

    next();
  };
};

const requireMfa = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.actor) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }

  assertFreshMfa(req.actor);
  next();
};

export { requireMfa, requirePermission };
