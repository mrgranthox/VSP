import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { authenticator } from "otplib";
import QRCode from "qrcode";

const decodeEncryptionKey = (encoded: string, keyName: string): Buffer => {
  const key = Buffer.from(encoded, "base64");

  if (key.length !== 32) {
    throw new Error(`${keyName} must decode to 32 bytes`);
  }

  return key;
};

const getEncryptionKey = (): Buffer => {
  const encoded = process.env.MFA_ENCRYPTION_KEY_BASE64;

  if (!encoded) {
    throw new Error("MFA_ENCRYPTION_KEY_BASE64 is required");
  }

  return decodeEncryptionKey(encoded, "MFA_ENCRYPTION_KEY_BASE64");
};

const getDecryptionKeys = (): Buffer[] => {
  const currentKey = getEncryptionKey();
  const previousEncoded = process.env.MFA_ENCRYPTION_KEY_BASE64_PREVIOUS;

  if (!previousEncoded) {
    return [currentKey];
  }

  const previousKey = decodeEncryptionKey(previousEncoded, "MFA_ENCRYPTION_KEY_BASE64_PREVIOUS");
  return Buffer.compare(currentKey, previousKey) === 0 ? [currentKey] : [currentKey, previousKey];
};

const encryptValue = (plaintext: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
};

const decryptValue = (ciphertext: string): string => {
  const payload = Buffer.from(ciphertext, "base64");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);

  for (const key of getDecryptionKeys()) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, iv);

      decipher.setAuthTag(tag);

      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    } catch {
      continue;
    }
  }

  throw new Error("Unable to decrypt MFA value with the configured keys");
};

const normalizeBackupCode = (code: string): string => code.trim().toUpperCase();

const hashBackupCode = (code: string): string => createHash("sha256").update(normalizeBackupCode(code)).digest("hex");

const generateBackupCodes = (count = 8): string[] =>
  Array.from({ length: count }, () => {
    const raw = randomBytes(4).toString("hex").toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });

const generateTotpSecret = (): string => authenticator.generateSecret();

const generateTotpQrCode = async (label: string, secret: string): Promise<string> => {
  const issuer = process.env.MFA_ISSUER ?? process.env.APP_NAME ?? "vsp-backend";
  const otpauthUrl = authenticator.keyuri(label, issuer, secret);

  return QRCode.toDataURL(otpauthUrl);
};

const verifyTotpCode = (secret: string, code: string): boolean => authenticator.verify({ token: code, secret });

export {
  decryptValue,
  encryptValue,
  generateBackupCodes,
  generateTotpQrCode,
  generateTotpSecret,
  hashBackupCode,
  normalizeBackupCode,
  verifyTotpCode
};
