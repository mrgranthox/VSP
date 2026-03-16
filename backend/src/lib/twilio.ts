import { randomInt } from "node:crypto";

import twilio from "twilio";

import { redis } from "./redis";
import { logger } from "./logger";

type VerificationPurpose = "phone_verification" | "mfa_setup" | "mfa_challenge";

interface SendVerificationInput {
  to: string;
  purpose: VerificationPurpose;
}

interface CheckVerificationInput extends SendVerificationInput {
  code: string;
}

const isMockMode = (): boolean =>
  process.env.TWILIO_VERIFY_MOCK_MODE === "true" ||
  !process.env.TWILIO_ACCOUNT_SID ||
  !process.env.TWILIO_AUTH_TOKEN ||
  !process.env.TWILIO_VERIFY_SERVICE_SID;

const getCodeTtlSeconds = (): number => {
  const parsed = Number.parseInt(process.env.TWILIO_VERIFY_CODE_TTL_SECONDS ?? "300", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
};

const buildMockKey = (purpose: VerificationPurpose, to: string): string => `twilio:verify:${purpose}:${to}`;

const buildClient = () => twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

const sendVerification = async ({ to, purpose }: SendVerificationInput): Promise<void> => {
  if (isMockMode()) {
    const code = String(randomInt(100_000, 1_000_000));
    await redis.set(buildMockKey(purpose, to), code, "EX", getCodeTtlSeconds());
    logger.info({ to, purpose, code }, "Generated mock Twilio Verify code");
    return;
  }

  await buildClient().verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!).verifications.create({
    to,
    channel: "sms"
  });
};

const checkVerification = async ({ to, purpose, code }: CheckVerificationInput): Promise<boolean> => {
  if (isMockMode()) {
    const key = buildMockKey(purpose, to);
    const storedCode = await redis.get(key);

    if (!storedCode || storedCode !== code) {
      return false;
    }

    await redis.del(key);
    return true;
  }

  const result = await buildClient().verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!).verificationChecks.create({
    to,
    code
  });

  return result.status === "approved";
};

const twilioVerifyProvider = {
  sendVerification,
  checkVerification
};

const twilioVerifyTesting = {
  getMockCode: (purpose: VerificationPurpose, to: string) => redis.get(buildMockKey(purpose, to))
};

export { twilioVerifyProvider, twilioVerifyTesting };
export type { VerificationPurpose };
