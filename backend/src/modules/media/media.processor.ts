import path from "node:path";

import { MediaCategory, MediaStatus, type Prisma } from "@prisma/client";

import { EventBus } from "../../lib/eventBus";
import { buildPublicMediaUrl, getMediaCategoryConfig } from "../../lib/media";
import { copyStorageObject, deleteStorageObject, readStorageObject, storageObjectExists, writeStorageObject } from "../../lib/storage";
import { MediaRepository } from "./media.repository";

const toJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;

const createDerivedKey = (storageKey: string, suffix: string, extension: string): string => {
  const directory = path.posix.dirname(storageKey);
  const baseName = path.posix.basename(storageKey, path.posix.extname(storageKey));

  return path.posix.join(directory, `${baseName}-${suffix}.${extension}`);
};

const isMockMalware = (buffer: Buffer): boolean => buffer.toString("utf8").includes("EICAR");

class MediaProcessor {
  constructor(private readonly repository: MediaRepository = new MediaRepository()) {}

  private async processImageAsset(asset: {
    id: string;
    storageKey: string;
    mimeType: string;
  }) {
    const variants = {
      thumbnail: createDerivedKey(asset.storageKey, "thumbnail", "webp"),
      small: createDerivedKey(asset.storageKey, "small", "webp"),
      medium: createDerivedKey(asset.storageKey, "medium", "webp"),
      large: createDerivedKey(asset.storageKey, "large", "webp"),
      original: asset.storageKey
    };

    await Promise.all([
      copyStorageObject(asset.storageKey, variants.thumbnail),
      copyStorageObject(asset.storageKey, variants.small),
      copyStorageObject(asset.storageKey, variants.medium),
      copyStorageObject(asset.storageKey, variants.large)
    ]);

    return this.repository.setReady(asset.id, {
      finalCdnUrl: buildPublicMediaUrl(variants.medium),
      variantUrls: toJson({
        thumbnail: buildPublicMediaUrl(variants.thumbnail),
        small: buildPublicMediaUrl(variants.small),
        medium: buildPublicMediaUrl(variants.medium),
        large: buildPublicMediaUrl(variants.large),
        original: buildPublicMediaUrl(variants.original)
      }),
      metadataJson: toJson({
        pipeline: "mock-image",
        mimeType: asset.mimeType
      })
    });
  }

  private async processVideoAsset(asset: {
    id: string;
    storageKey: string;
    mimeType: string;
  }) {
    const transcodedKey = createDerivedKey(asset.storageKey, "transcoded", "mp4");
    const posterKey = createDerivedKey(asset.storageKey, "poster", "webp");

    await copyStorageObject(asset.storageKey, transcodedKey);
    await writeStorageObject(posterKey, Buffer.from("mock-poster"));

    return this.repository.setReady(asset.id, {
      finalCdnUrl: buildPublicMediaUrl(transcodedKey),
      variantUrls: toJson({
        poster: buildPublicMediaUrl(posterKey),
        transcoded: buildPublicMediaUrl(transcodedKey),
        original: buildPublicMediaUrl(asset.storageKey)
      }),
      metadataJson: toJson({
        pipeline: "mock-video",
        mimeType: asset.mimeType
      })
    });
  }

  private async processPrivateAsset(asset: {
    id: string;
    storageKey: string;
    mimeType: string;
  }) {
    return this.repository.setReady(asset.id, {
      finalCdnUrl: null,
      variantUrls: toJson({
        original: asset.storageKey
      }),
      metadataJson: toJson({
        pipeline: "private-pass-through",
        mimeType: asset.mimeType
      })
    });
  }

  async processMediaAsset(mediaId: string) {
    const asset = await this.repository.getAssetById(mediaId);

    if (!asset) {
      return null;
    }

    const exists = await storageObjectExists(asset.storageKey);

    if (!exists) {
      return this.repository.setFailed(asset.id, MediaStatus.FAILED, "Uploaded file is missing from storage");
    }

    const buffer = await readStorageObject(asset.storageKey);

    if (isMockMalware(buffer)) {
      await deleteStorageObject(asset.storageKey);
      await EventBus.emit("FRAUD_SIGNAL_CREATED", {
        userId: asset.ownerUserId,
        entityType: "media_asset",
        entityId: asset.id,
        signalKey: "MALWARE_DETECTED",
        score: 100
      });

      return this.repository.setFailed(asset.id, MediaStatus.INFECTED, "Malware detected during media scan");
    }

    const config = getMediaCategoryConfig(asset.category);

    if (config.visibility === "PRIVATE") {
      return this.processPrivateAsset(asset);
    }

    if (
      asset.category === MediaCategory.avatar ||
      asset.category === MediaCategory.portfolio_image ||
      asset.category === MediaCategory.post_image
    ) {
      return this.processImageAsset(asset);
    }

    if (asset.category === MediaCategory.portfolio_video || asset.category === MediaCategory.post_video) {
      return this.processVideoAsset(asset);
    }

    return this.processPrivateAsset(asset);
  }
}

export { MediaProcessor };
