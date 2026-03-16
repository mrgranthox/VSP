import { redis } from "../../lib/redis";

type PendingMfaMethod = "totp" | "sms";

interface PendingMfaSetup {
  method: PendingMfaMethod;
  totpSecretCiphertext?: string;
}

class AuthMfaStore {
  private buildPendingSetupKey(userId: string): string {
    return `auth:mfa:pending:${userId}`;
  }

  async savePendingSetup(userId: string, value: PendingMfaSetup, ttlSeconds = 600): Promise<void> {
    await redis.set(this.buildPendingSetupKey(userId), JSON.stringify(value), "EX", ttlSeconds);
  }

  async getPendingSetup(userId: string): Promise<PendingMfaSetup | null> {
    const raw = await redis.get(this.buildPendingSetupKey(userId));

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as PendingMfaSetup;
  }

  async clearPendingSetup(userId: string): Promise<void> {
    await redis.del(this.buildPendingSetupKey(userId));
  }
}

const authMfaStore = new AuthMfaStore();

export { authMfaStore };
export type { PendingMfaMethod, PendingMfaSetup };
