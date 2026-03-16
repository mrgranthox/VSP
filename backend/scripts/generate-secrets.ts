import fs from "node:fs";
import path from "node:path";
import { generateKeyPairSync, randomBytes } from "node:crypto";

const getArgValue = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
};

const getOutputFormat = (): "dotenv" | "json" => {
  const value = getArgValue("--format") ?? "dotenv";

  if (value !== "dotenv" && value !== "json") {
    throw new Error(`Unsupported format: ${value}`);
  }

  return value;
};

const toFileName = (key: string): string => `${key.toLowerCase()}.secret`;

const buildSecretSet = () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" }
  });

  return {
    JWT_PRIVATE_KEY_BASE64: Buffer.from(privateKey).toString("base64"),
    JWT_PUBLIC_KEY_BASE64: Buffer.from(publicKey).toString("base64"),
    MFA_ENCRYPTION_KEY_BASE64: randomBytes(32).toString("base64"),
    STORAGE_SIGNING_SECRET: randomBytes(32).toString("hex"),
    INTERNAL_API_KEY: randomBytes(32).toString("hex"),
    ALERT_WEBHOOK_BEARER_TOKEN: randomBytes(32).toString("hex")
  } as const;
};

const renderOutput = (values: Record<string, string>, format: "dotenv" | "json"): string => {
  if (format === "json") {
    return JSON.stringify(values, null, 2);
  }

  return Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
};

const main = async (): Promise<void> => {
  const writeDirArg = getArgValue("--write-dir");
  const format = getOutputFormat();
  const secrets = buildSecretSet();

  if (!writeDirArg) {
    console.log(renderOutput(secrets, format));
    return;
  }

  const writeDir = path.resolve(writeDirArg);
  fs.mkdirSync(writeDir, { recursive: true });

  const fileBackedEnv: Record<string, string> = {};

  for (const [key, value] of Object.entries(secrets)) {
    const filePath = path.join(writeDir, toFileName(key));
    fs.writeFileSync(filePath, `${value}\n`, { mode: 0o600 });
    fileBackedEnv[`${key}_FILE`] = filePath;
  }

  console.log(renderOutput(fileBackedEnv, format));
};

void main().catch((error) => {
  console.error(`[ops] secret generation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
