interface ActorContext {
  userId: string;
  roles?: string[];
  permissions?: string[];
  mfaVerified?: boolean;
  mfaVerifiedAt?: Date;
  ipAddress?: string;
  sessionId?: string;
}

declare global {
  namespace Express {
    interface Request {
      actor?: ActorContext;
    }
  }
}

export type { ActorContext };

export {};
