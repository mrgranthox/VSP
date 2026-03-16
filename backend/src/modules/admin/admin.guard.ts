import { type NextFunction, type Request, type Response } from "express";

import { Errors } from "../../lib/errors";
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

    next();
  };
};

const requireMfa = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.actor) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }

  if (!req.actor.mfaVerified) {
    throw Errors.MFA_REQUIRED();
  }

  next();
};

export { requireMfa, requirePermission };
