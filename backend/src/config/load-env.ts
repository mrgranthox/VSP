import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

let loaded = false;

const resolveSecretFilePath = (value: string): string => (path.isAbsolute(value) ? value : path.resolve(process.cwd(), value));

const hydrateFileBackedEnv = (): void => {
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.endsWith("_FILE") || !value) {
      continue;
    }

    const targetKey = key.slice(0, -5);
    const currentValue = process.env[targetKey];

    if (currentValue !== undefined && currentValue !== "") {
      continue;
    }

    const secretPath = resolveSecretFilePath(value);

    if (!fs.existsSync(secretPath)) {
      throw new Error(`${key} points to a missing file: ${secretPath}`);
    }

    process.env[targetKey] = fs.readFileSync(secretPath, "utf8").trim();
  }
};

const loadEnvFiles = (): void => {
  if (loaded) {
    return;
  }

  const initialKeys = new Set(Object.keys(process.env));

  for (const candidate of [".env", ".env.local"]) {
    const envPath = path.resolve(process.cwd(), candidate);

    if (!fs.existsSync(envPath)) {
      continue;
    }

    const parsed = dotenv.parse(fs.readFileSync(envPath));

    for (const [key, value] of Object.entries(parsed)) {
      if (candidate === ".env.local") {
        if (!initialKeys.has(key)) {
          process.env[key] = value;
        }

        continue;
      }

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }

  hydrateFileBackedEnv();
  loaded = true;
};

export { loadEnvFiles };
