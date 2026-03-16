import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildCliDatabaseUrl,
  buildPrismaDatabaseUrl,
  buildScratchDatabaseName,
  countPublicTables,
  createBackupDump,
  dropDatabase,
  getAppliedMigrationCount,
  getDatabaseUrl,
  recreateDatabase,
  restoreDump,
  verifyPrismaMigrateStatus
} from "./postgres";

const getArgValue = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
};

const hasFlag = (flag: string): boolean => process.argv.includes(flag);

const main = async (): Promise<void> => {
  const sourceDatabaseUrl = getDatabaseUrl();
  const providedDumpPath = getArgValue("--dump");
  const generatedDumpPath = path.resolve(os.tmpdir(), `vsp-restore-verify-${Date.now()}.dump`);
  const dumpPath = path.resolve(providedDumpPath ?? generatedDumpPath);
  const keepDump = hasFlag("--keep-dump");
  const keepDatabase = hasFlag("--keep-db");
  const scratchDatabaseName = getArgValue("--database") ?? buildScratchDatabaseName(sourceDatabaseUrl);
  const scratchCliDatabaseUrl = buildCliDatabaseUrl(sourceDatabaseUrl, scratchDatabaseName);
  const scratchPrismaDatabaseUrl = buildPrismaDatabaseUrl(sourceDatabaseUrl, scratchDatabaseName);
  const usingGeneratedDump = !providedDumpPath;

  try {
    if (providedDumpPath) {
      if (!fs.existsSync(dumpPath)) {
        throw new Error(`Dump file does not exist: ${dumpPath}`);
      }
    } else {
      console.log(`[ops] creating temporary backup at ${dumpPath}`);
      await createBackupDump(dumpPath, sourceDatabaseUrl);
    }

    console.log(`[ops] recreating scratch database ${scratchDatabaseName}`);
    await recreateDatabase(sourceDatabaseUrl, scratchDatabaseName);

    console.log(`[ops] restoring dump into ${scratchDatabaseName}`);
    await restoreDump(dumpPath, scratchCliDatabaseUrl);

    console.log("[ops] verifying restored database");
    const [publicTableCount, appliedMigrationCount] = await Promise.all([
      countPublicTables(scratchCliDatabaseUrl),
      getAppliedMigrationCount(scratchCliDatabaseUrl)
    ]);

    if (publicTableCount === 0) {
      throw new Error("Restore verification failed because the restored database has no public tables");
    }

    await verifyPrismaMigrateStatus(scratchPrismaDatabaseUrl);

    console.log(
      JSON.stringify(
        {
          scratchDatabase: scratchDatabaseName,
          dumpPath,
          publicTableCount,
          appliedMigrationCount,
          prismaMigrateStatus: "ok"
        },
        null,
        2
      )
    );
  } finally {
    if (!keepDatabase) {
      await dropDatabase(sourceDatabaseUrl, scratchDatabaseName).catch((error) => {
        console.error(`[ops] failed to drop scratch database ${scratchDatabaseName}: ${error instanceof Error ? error.message : String(error)}`);
      });
    }

    if (usingGeneratedDump && !keepDump) {
      fs.rmSync(dumpPath, { force: true });
    }
  }
};

void main().catch((error) => {
  console.error(`[ops] restore verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
