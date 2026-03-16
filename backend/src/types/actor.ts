interface ActorContext {
  userId: string;
  roles?: string[];
  permissions?: string[];
  mfaVerified?: boolean;
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
