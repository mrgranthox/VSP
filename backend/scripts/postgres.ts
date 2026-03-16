import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import { loadEnvFiles } from "../src/config/load-env";

loadEnvFiles();

const backendRoot = path.resolve(__dirname, "..");

interface RunCommandOptions {
  captureStdout?: boolean;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

const getDatabaseUrl = (): string => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
};

const getDatabaseName = (databaseUrl = getDatabaseUrl()): string => {
  const url = new URL(databaseUrl);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));

  if (!databaseName) {
    throw new Error("DATABASE_URL must include a database name");
  }

  return databaseName;
};

const buildCliDatabaseUrl = (databaseUrl: string, databaseName?: string): string => {
  const url = new URL(databaseUrl);

  if (databaseName) {
    url.pathname = `/${encodeURIComponent(databaseName)}`;
  }

  url.searchParams.delete("schema");
  return url.toString();
};

const buildPrismaDatabaseUrl = (databaseUrl: string, databaseName: string): string => {
  const url = new URL(databaseUrl);
  url.pathname = `/${encodeURIComponent(databaseName)}`;
  return url.toString();
};

const defaultBackupPath = (databaseUrl = getDatabaseUrl()): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.resolve(backendRoot, "backups", `${getDatabaseName(databaseUrl)}-${timestamp}.dump`);
};

const ensureParentDirectory = (filePath: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const runCommand = async (command: string, args: string[], options: RunCommandOptions = {}): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env
      },
      stdio: options.captureStdout ? ["ignore", "pipe", "pipe"] : "inherit"
    });

    let stdout = "";
    let stderr = "";

    if (options.captureStdout) {
      child.stdout?.on("data", (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", (error) => {
      const maybeErrno = error as NodeJS.ErrnoException;

      if (maybeErrno.code === "ENOENT") {
        reject(new Error(`${command} is required for database backup/restore operations but was not found in PATH`));
        return;
      }

      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(new Error(`${command} exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
    });
  });

const createBackupDump = async (outputPath: string, databaseUrl = getDatabaseUrl()): Promise<string> => {
  const resolvedOutputPath = path.resolve(outputPath);
  ensureParentDirectory(resolvedOutputPath);

  await runCommand("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--file", resolvedOutputPath, buildCliDatabaseUrl(databaseUrl)]);

  return resolvedOutputPath;
};

const buildScratchDatabaseName = (databaseUrl = getDatabaseUrl()): string => {
  const sanitizedBase = getDatabaseName(databaseUrl).replace(/[^a-zA-Z0-9_]/g, "_");
  const suffix = `restore_verify_${Date.now()}`;
  const maxBaseLength = Math.max(1, 63 - suffix.length - 1);

  return `${sanitizedBase.slice(0, maxBaseLength)}_${suffix}`;
};

const quoteIdentifier = (value: string): string => `"${value.replace(/"/g, "\"\"")}"`;

const dropDatabase = async (databaseUrl: string, databaseName: string): Promise<void> => {
  await runCommand("psql", [
    buildCliDatabaseUrl(databaseUrl, "postgres"),
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`
  ]);
};

const recreateDatabase = async (databaseUrl: string, databaseName: string): Promise<void> => {
  await dropDatabase(databaseUrl, databaseName);
  await runCommand("psql", [
    buildCliDatabaseUrl(databaseUrl, "postgres"),
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `CREATE DATABASE ${quoteIdentifier(databaseName)}`
  ]);
};

const restoreDump = async (dumpPath: string, databaseUrl: string): Promise<void> => {
  await runCommand("pg_restore", ["--clean", "--if-exists", "--no-owner", "--no-privileges", "--dbname", buildCliDatabaseUrl(databaseUrl), path.resolve(dumpPath)]);
};

const countPublicTables = async (databaseUrl: string): Promise<number> => {
  const output = await runCommand(
    "psql",
    [buildCliDatabaseUrl(databaseUrl), "-v", "ON_ERROR_STOP=1", "-tA", "-c", "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"],
    { captureStdout: true }
  );
  const count = Number.parseInt(output, 10);

  if (!Number.isFinite(count)) {
    throw new Error(`Failed to parse public table count from psql output: ${output}`);
  }

  return count;
};

const getAppliedMigrationCount = async (databaseUrl: string): Promise<number> => {
  const output = await runCommand(
    "psql",
    [buildCliDatabaseUrl(databaseUrl), "-v", "ON_ERROR_STOP=1", "-tA", "-c", 'SELECT COUNT(*) FROM "_prisma_migrations"'],
    { captureStdout: true }
  );
  const count = Number.parseInt(output, 10);

  if (!Number.isFinite(count)) {
    throw new Error(`Failed to parse migration count from psql output: ${output}`);
  }

  return count;
};

const verifyPrismaMigrateStatus = async (databaseUrl: string): Promise<void> => {
  await runCommand("npx", ["prisma", "migrate", "status"], {
    cwd: backendRoot,
    env: {
      DATABASE_URL: databaseUrl
    }
  });
};

export {
  backendRoot,
  buildCliDatabaseUrl,
  buildPrismaDatabaseUrl,
  buildScratchDatabaseName,
  countPublicTables,
  createBackupDump,
  defaultBackupPath,
  dropDatabase,
  getAppliedMigrationCount,
  getDatabaseName,
  getDatabaseUrl,
  recreateDatabase,
  restoreDump,
  runCommand,
  verifyPrismaMigrateStatus
};
