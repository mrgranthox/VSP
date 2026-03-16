import fs from "node:fs/promises";
import path from "node:path";

const getStorageRoot = (): string => path.resolve(process.cwd(), process.env.STORAGE_LOCAL_ROOT ?? ".tmp/storage");

const getStoragePathForKey = (storageKey: string): string => path.resolve(getStorageRoot(), storageKey);

const ensureParentDir = async (storageKey: string): Promise<void> => {
  await fs.mkdir(path.dirname(getStoragePathForKey(storageKey)), { recursive: true });
};

const writeStorageObject = async (storageKey: string, data: Buffer): Promise<void> => {
  await ensureParentDir(storageKey);
  await fs.writeFile(getStoragePathForKey(storageKey), data);
};

const readStorageObject = async (storageKey: string): Promise<Buffer> => fs.readFile(getStoragePathForKey(storageKey));

const storageObjectExists = async (storageKey: string): Promise<boolean> => {
  try {
    await fs.access(getStoragePathForKey(storageKey));
    return true;
  } catch {
    return false;
  }
};

const copyStorageObject = async (fromKey: string, toKey: string): Promise<void> => {
  await ensureParentDir(toKey);
  await fs.copyFile(getStoragePathForKey(fromKey), getStoragePathForKey(toKey));
};

const deleteStorageObject = async (storageKey: string): Promise<void> => {
  try {
    await fs.rm(getStoragePathForKey(storageKey), { force: true });
  } catch {
    // No-op: cleanup should be best-effort.
  }
};

const getStorageObjectSize = async (storageKey: string): Promise<number | null> => {
  try {
    const stats = await fs.stat(getStoragePathForKey(storageKey));
    return stats.size;
  } catch {
    return null;
  }
};

export {
  copyStorageObject,
  deleteStorageObject,
  getStorageObjectSize,
  getStoragePathForKey,
  getStorageRoot,
  readStorageObject,
  storageObjectExists,
  writeStorageObject
};
