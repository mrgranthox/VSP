import { createHash, randomBytes } from "node:crypto";

import { MediaCategory, MediaStatus, type MediaAsset, type Prisma } from "@prisma/client";

import { Errors } from "../../lib/errors";
import {
  buildPrivateReadUrl,
  buildPublicMediaUrl,
  buildStorageKey,
  ensureMediaUploadAllowed,
  getMediaCategoryConfig,
  guessFileExtension,
  inferMimeTypeFromRef,
  isUuidLike,
  normalizePrivateMediaRef,
  resolveMediaUrl,
  verifyPrivateReadUrl
} from "../../lib/media";
import { getStorageObjectSize, getStoragePathForKey, storageObjectExists, writeStorageObject } from "../../lib/storage";
import type { ActorContext } from "../../types/actor";
import { enqueueNamedJob } from "../../queues";
import { MediaProcessor } from "./media.processor";
import { MediaRepository } from "./media.repository";

const hashToken = (value: string): string => createHash("sha256").update(value).digest("hex");

const getPendingUploadTtlSeconds = (): number => Number.parseInt(process.env.STORAGE_PENDING_MEDIA_TTL_SECONDS ?? "1800", 10);

const shouldProcessMediaInline = (): boolean => {
  const explicit = process.env.MEDIA_PROCESS_INLINE?.trim().toLowerCase();

  if (explicit === "true") {
    return true;
  }

  if (explicit === "false") {
    return false;
  }

  return process.env.NODE_ENV === "test" || process.env.BACKGROUND_WORKERS_ENABLED !== "true";
};

type ResolvedPublicMedia = {
  mediaAssetId?: string;
  mediaUrl: string;
  mediaType: "image" | "video";
};

type ResolvedPrivateMedia = {
  mediaAssetId?: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: bigint | null;
};

class MediaService {
  constructor(
    private readonly repository: MediaRepository = new MediaRepository(),
    private readonly processor: MediaProcessor = new MediaProcessor()
  ) {}

  private mapAsset(asset: MediaAsset) {
    const isPrivate = getMediaCategoryConfig(asset.category).visibility === "PRIVATE";

    return {
      id: asset.id,
      category: asset.category,
      visibility: asset.visibility,
      mimeType: asset.mimeType,
      sizeBytes: Number(asset.sizeBytes),
      status: asset.status,
      storageKey: asset.storageKey,
      finalCdnUrl: asset.finalCdnUrl,
      readUrl: isPrivate && asset.status === MediaStatus.READY ? buildPrivateReadUrl(asset.storageKey) : null,
      variantUrls: asset.variantUrls,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt
    };
  }

  private async getOwnedAssetOrThrow(actor: ActorContext, mediaId: string) {
    const asset = await this.repository.getOwnedAsset(mediaId, actor.userId);

    if (!asset) {
      throw Errors.MEDIA_ASSET_NOT_FOUND();
    }

    return asset;
  }

  private async getReadyOwnedAsset(actor: ActorContext, mediaId: string, allowedCategories: MediaCategory[]) {
    const asset = await this.getOwnedAssetOrThrow(actor, mediaId);

    if (!allowedCategories.includes(asset.category)) {
      throw Errors.FILE_UPLOAD_INVALID_TYPE();
    }

    if (asset.status !== MediaStatus.READY) {
      throw Errors.MEDIA_UPLOAD_NOT_READY();
    }

    return asset;
  }

  async requestUploadUrl(
    actor: ActorContext,
    data: {
      category: MediaCategory;
      mimeType: string;
      sizeBytes: number;
      filename?: string;
    }
  ) {
    ensureMediaUploadAllowed(data.category, data.mimeType, data.sizeBytes);

    const config = getMediaCategoryConfig(data.category);
    const extension = guessFileExtension(data.mimeType, data.filename);
    const storageKey = buildStorageKey(data.category, actor.userId, extension);
    const uploadToken = randomBytes(32).toString("hex");
    const uploadUrlExpiresAt = new Date(Date.now() + getPendingUploadTtlSeconds() * 1000);
    const asset = await this.repository.createPendingAsset({
      ownerUserId: actor.userId,
      category: data.category,
      visibility: config.visibility,
      mimeType: data.mimeType,
      sizeBytes: BigInt(data.sizeBytes),
      originalFilename: data.filename,
      bucket: config.bucket,
      storageKey,
      uploadTokenHash: hashToken(uploadToken),
      uploadUrlExpiresAt
    });

    const uploadUrl = new URL(`/api/v1/media/mock-upload/${asset.id}`, process.env.APP_BASE_URL ?? `http://localhost:${process.env.PORT ?? "3000"}`);
    uploadUrl.searchParams.set("token", uploadToken);

    return {
      mediaId: asset.id,
      uploadUrl: uploadUrl.toString(),
      uploadMethod: "PUT",
      expiresAt: uploadUrlExpiresAt,
      headers: {
        "content-type": data.mimeType
      },
      asset: this.mapAsset(asset)
    };
  }

  async acceptMockUpload(mediaId: string, token: string, body: Buffer) {
    const asset = await this.repository.getAssetById(mediaId);

    if (!asset) {
      throw Errors.MEDIA_ASSET_NOT_FOUND();
    }

    if (!asset.uploadTokenHash || asset.uploadTokenHash !== hashToken(token)) {
      throw Errors.MEDIA_READ_URL_INVALID();
    }

    if (!asset.uploadUrlExpiresAt || asset.uploadUrlExpiresAt.getTime() < Date.now()) {
      throw Errors.MEDIA_UPLOAD_EXPIRED();
    }

    await writeStorageObject(asset.storageKey, body);

    const actualSizeBytes = await getStorageObjectSize(asset.storageKey);

    await this.repository.setUploadCompleted(
      asset.id,
      actualSizeBytes === null
        ? undefined
        : ({
            uploadedSizeBytes: actualSizeBytes
          } as Prisma.InputJsonValue)
    );
  }

  async confirmUpload(actor: ActorContext, mediaId: string) {
    const asset = await this.getOwnedAssetOrThrow(actor, mediaId);
    const confirmableStatuses: MediaStatus[] = [MediaStatus.PENDING_UPLOAD, MediaStatus.UPLOADED, MediaStatus.PROCESSING];

    if (asset.status === MediaStatus.READY) {
      return this.mapAsset(asset);
    }

    if (!confirmableStatuses.includes(asset.status)) {
      return this.mapAsset(asset);
    }

    const exists = await storageObjectExists(asset.storageKey);

    if (!exists) {
      throw Errors.MEDIA_UPLOAD_NOT_READY();
    }

    if (asset.status !== MediaStatus.PROCESSING) {
      await this.repository.setProcessing(asset.id);
    }

    if (shouldProcessMediaInline()) {
      const processed = await this.processor.processMediaAsset(asset.id);

      if (!processed) {
        throw Errors.MEDIA_ASSET_NOT_FOUND();
      }

      return this.mapAsset(processed);
    }

    if (asset.category === MediaCategory.portfolio_video || asset.category === MediaCategory.post_video) {
      await enqueueNamedJob("media_process_video", { mediaId: asset.id }, "system");
    } else {
      await enqueueNamedJob("media_process_image", { mediaId: asset.id }, "system");
    }

    const latestAsset = await this.repository.getAssetById(asset.id);

    if (!latestAsset) {
      throw Errors.MEDIA_ASSET_NOT_FOUND();
    }

    return this.mapAsset(latestAsset);
  }

  async getAsset(actor: ActorContext, mediaId: string) {
    const asset = await this.getOwnedAssetOrThrow(actor, mediaId);
    return this.mapAsset(asset);
  }

  async resolvePublicMediaInput(actor: ActorContext, input: string, allowedCategories: MediaCategory[]): Promise<ResolvedPublicMedia> {
    if (isUuidLike(input)) {
      const asset = await this.getReadyOwnedAsset(actor, input, allowedCategories);

      return {
        mediaAssetId: asset.id,
        mediaUrl: asset.finalCdnUrl ?? buildPublicMediaUrl(asset.storageKey),
        mediaType: asset.mimeType.startsWith("video/") ? "video" : "image"
      };
    }

    return {
      mediaUrl: resolveMediaUrl(input),
      mediaType: inferMimeTypeFromRef(input).startsWith("video/") ? "video" : "image"
    };
  }

  async resolvePrivateMediaInput(actor: ActorContext, input: string, allowedCategories: MediaCategory[]): Promise<ResolvedPrivateMedia> {
    if (isUuidLike(input)) {
      const asset = await this.getReadyOwnedAsset(actor, input, allowedCategories);

      return {
        mediaAssetId: asset.id,
        fileUrl: normalizePrivateMediaRef(asset.storageKey),
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes
      };
    }

    return {
      fileUrl: normalizePrivateMediaRef(input),
      mimeType: inferMimeTypeFromRef(input),
      sizeBytes: null
    };
  }

  async resolveVerificationDocumentRefs(actor: ActorContext, inputs: string[], allowedCategories: MediaCategory[]): Promise<string[]> {
    const resolved = await Promise.all(inputs.map((input) => this.resolvePrivateMediaInput(actor, input, allowedCategories)));
    return resolved.map((item) => item.fileUrl);
  }

  getSignedPrivateReadUrl(storageKey: string): string {
    return buildPrivateReadUrl(storageKey);
  }

  async resolvePrivateReadRequest(query: { key?: string; expires?: string; signature?: string }) {
    const storageKey = query.key?.trim();
    const expires = query.expires?.trim();
    const signature = query.signature?.trim();

    if (!storageKey || !expires || !signature || !verifyPrivateReadUrl(storageKey, expires, signature)) {
      throw Errors.MEDIA_READ_URL_INVALID();
    }

    const exists = await storageObjectExists(storageKey);

    if (!exists) {
      throw Errors.MEDIA_ASSET_NOT_FOUND();
    }

    return {
      storageKey,
      absolutePath: getStoragePathForKey(storageKey)
    };
  }
}

export { MediaService };
export type { ResolvedPrivateMedia, ResolvedPublicMedia };
