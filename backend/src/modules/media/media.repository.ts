import { MediaCategory, MediaStatus, MediaVisibility, Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";

class MediaRepository {
  async createPendingAsset(data: {
    ownerUserId: string;
    category: MediaCategory;
    visibility: MediaVisibility;
    mimeType: string;
    sizeBytes: bigint;
    originalFilename?: string;
    bucket: string;
    storageKey: string;
    uploadTokenHash: string;
    uploadUrlExpiresAt: Date;
  }) {
    return prisma.mediaAsset.create({
      data
    });
  }

  async getAssetById(mediaId: string) {
    return prisma.mediaAsset.findUnique({
      where: {
        id: mediaId
      }
    });
  }

  async getOwnedAsset(mediaId: string, ownerUserId: string) {
    return prisma.mediaAsset.findFirst({
      where: {
        id: mediaId,
        ownerUserId
      }
    });
  }

  async updateAsset(mediaId: string, data: Prisma.MediaAssetUncheckedUpdateInput) {
    return prisma.mediaAsset.update({
      where: {
        id: mediaId
      },
      data
    });
  }

  async setUploadCompleted(mediaId: string, metadataJson?: Prisma.InputJsonValue) {
    return prisma.mediaAsset.update({
      where: {
        id: mediaId
      },
      data: {
        status: MediaStatus.UPLOADED,
        uploadedAt: new Date(),
        uploadTokenHash: null,
        metadataJson
      }
    });
  }

  async setProcessing(mediaId: string) {
    return prisma.mediaAsset.update({
      where: {
        id: mediaId
      },
      data: {
        status: MediaStatus.PROCESSING,
        confirmedAt: new Date()
      }
    });
  }

  async setReady(
    mediaId: string,
    data: {
      finalCdnUrl?: string | null;
      variantUrls?: Prisma.InputJsonValue;
      metadataJson?: Prisma.InputJsonValue;
    }
  ) {
    return prisma.mediaAsset.update({
      where: {
        id: mediaId
      },
      data: {
        status: MediaStatus.READY,
        finalCdnUrl: data.finalCdnUrl ?? null,
        variantUrls: data.variantUrls,
        metadataJson: data.metadataJson
      }
    });
  }

  async setFailed(mediaId: string, status: MediaStatus, reason: string) {
    return prisma.mediaAsset.update({
      where: {
        id: mediaId
      },
      data: {
        status,
        failureReason: reason
      }
    });
  }

  async expirePendingUploads(cutoff: Date): Promise<number> {
    const result = await prisma.mediaAsset.updateMany({
      where: {
        status: {
          in: ["PENDING_UPLOAD", "UPLOADED"]
        },
        createdAt: {
          lt: cutoff
        }
      },
      data: {
        status: "EXPIRED",
        failureReason: "Pending upload expired before confirmation"
      }
    });

    return result.count;
  }
}

export { MediaRepository };
