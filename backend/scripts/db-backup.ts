import path from "node:path";

import { createBackupDump, defaultBackupPath, getDatabaseName, getDatabaseUrl } from "./postgres";

const getArgValue = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
};

const main = async (): Promise<void> => {
  const databaseUrl = getDatabaseUrl();
  const outputArg = getArgValue("--output");
  const outputPath = path.resolve(outputArg ?? defaultBackupPath(databaseUrl));

  console.log(`[ops] writing backup for ${getDatabaseName(databaseUrl)} to ${outputPath}`);
  await createBackupDump(outputPath, databaseUrl);
  console.log(JSON.stringify({ dumpPath: outputPath }, null, 2));
};

void main().catch((error) => {
  console.error(`[ops] backup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
