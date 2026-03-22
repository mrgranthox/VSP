import { type NextFunction, type Request, type Response } from "express";

import { env } from "../config/env";
import { Errors } from "../lib/errors";
import type { ActorContext } from "../types/actor";

const hasFreshMfa = (actor?: ActorContext, now: Date = new Date()): boolean => {
  if (!actor?.mfaVerified || !actor.mfaVerifiedAt) {
    return false;
  }

  return now.getTime() - actor.mfaVerifiedAt.getTime() <= env.ADMIN_MFA_STEP_UP_TTL_SECONDS * 1000;
};

const assertFreshMfa = (actor?: ActorContext): void => {
  if (!hasFreshMfa(actor)) {
    throw Errors.MFA_REQUIRED();
  }
};

const requireMfa = (req: Request, _res: Response, next: NextFunction): void => {
  assertFreshMfa(req.actor);
  next();
};

export { assertFreshMfa, hasFreshMfa, requireMfa };
