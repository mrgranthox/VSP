import { type NextFunction, type Request, type Response } from "express";

import { Errors } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { verifyAccessToken } from "../modules/auth/auth.tokens";

const buildActor = async (req: Request) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }

  const token = authorizationHeader.replace("Bearer ", "").trim();
  const payload = verifyAccessToken(token);
  const session = await prisma.userSession.findUnique({
    where: { id: payload.jti },
    select: {
      userId: true,
      mfaVerified: true,
      expiresAt: true,
      revokedAt: true
    }
  });

  if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= new Date()) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }

  if (payload.status === "SUSPENDED") {
    throw Errors.USER_SUSPENDED();
  }

  return {
    userId: payload.sub,
    roles: payload.roles,
    mfaVerified: session.mfaVerified,
    ipAddress: req.ip,
    sessionId: payload.jti
  };
};

const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  req.actor = await buildActor(req);
  next();
};

const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    req.actor = await buildActor(req);
  } catch {
    req.actor = undefined;
  }

  next();
};

export { authenticate, optionalAuthenticate };
