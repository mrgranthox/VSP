import { type NextFunction, type Request, type Response } from "express";

import { Errors } from "../lib/errors";

const requireMfa = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.actor?.mfaVerified) {
    throw Errors.MFA_REQUIRED();
  }

  next();
};

export { requireMfa };
