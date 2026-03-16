import { createHash } from "node:crypto";

import { redis } from "../../lib/redis";

const hashValue = (value: string): string => createHash("sha256").update(value).digest("hex");
const debugTokensEnabled = process.env.AUTH_DEBUG_TOKENS_ENABLED !== "false" && process.env.NODE_ENV !== "production";

class AuthTokenStore {
  private buildEmailVerificationKey(token: string): string {
    return `auth:email-verification:${hashValue(token)}`;
  }

  private buildPasswordResetKey(token: string): string {
    return `auth:password-reset:${hashValue(token)}`;
  }

  private buildDebugKey(purpose: "email-verification" | "password-reset", userId: string): string {
    return `auth:debug:${purpose}:${userId}`;
  }

  private async consumeValue(key: string): Promise<string | null> {
    const results = await redis.multi().get(key).del(key).exec();
    const value = results?.[0]?.[1];
    return typeof value === "string" ? value : null;
  }

  async saveEmailVerificationToken(userId: string, token: string, ttlSeconds: number): Promise<void> {
    const multi = redis.multi().set(this.buildEmailVerificationKey(token), userId, "EX", ttlSeconds);

    if (debugTokensEnabled) {
      multi.set(this.buildDebugKey("email-verification", userId), token, "EX", ttlSeconds);
    }

    await multi.exec();
  }

  async consumeEmailVerificationToken(token: string): Promise<string | null> {
    return this.consumeValue(this.buildEmailVerificationKey(token));
  }

  async savePasswordResetToken(userId: string, token: string, ttlSeconds: number): Promise<void> {
    const multi = redis.multi().set(this.buildPasswordResetKey(token), userId, "EX", ttlSeconds);

    if (debugTokensEnabled) {
      multi.set(this.buildDebugKey("password-reset", userId), token, "EX", ttlSeconds);
    }

    await multi.exec();
  }

  async consumePasswordResetToken(token: string): Promise<string | null> {
    return this.consumeValue(this.buildPasswordResetKey(token));
  }
}

const authTokenStore = new AuthTokenStore();

const authTokenStoreTesting = {
  getEmailVerificationToken: (userId: string) => redis.get(`auth:debug:email-verification:${userId}`),
  getPasswordResetToken: (userId: string) => redis.get(`auth:debug:password-reset:${userId}`)
};

export { authTokenStore, authTokenStoreTesting };
