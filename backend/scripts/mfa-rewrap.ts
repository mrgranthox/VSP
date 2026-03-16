import { loadEnvFiles } from "../src/config/load-env";
import { prisma } from "../src/lib/prisma";
import { decryptValue, encryptValue } from "../src/modules/auth/auth.mfa";

loadEnvFiles();

const hasFlag = (flag: string): boolean => process.argv.includes(flag);

const main = async (): Promise<void> => {
  const dryRun = hasFlag("--dry-run");
  const configs = await prisma.userMfaConfig.findMany({
    select: {
      id: true,
      userId: true,
      totpSecretCiphertext: true,
      backupCodeCiphertexts: true
    }
  });

  let updatedConfigs = 0;

  for (const config of configs) {
    const nextTotpSecretCiphertext = config.totpSecretCiphertext ? encryptValue(decryptValue(config.totpSecretCiphertext)) : null;
    const nextBackupCodeCiphertexts = config.backupCodeCiphertexts.map((ciphertext) => encryptValue(decryptValue(ciphertext)));

    if (dryRun) {
      updatedConfigs += 1;
      continue;
    }

    await prisma.userMfaConfig.update({
      where: {
        id: config.id
      },
      data: {
        totpSecretCiphertext: nextTotpSecretCiphertext,
        backupCodeCiphertexts: nextBackupCodeCiphertexts
      }
    });
    updatedConfigs += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        scannedConfigs: configs.length,
        updatedConfigs
      },
      null,
      2
    )
  );
};

void main()
  .catch((error) => {
    console.error(`[ops] MFA rewrap failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
