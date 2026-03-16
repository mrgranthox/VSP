import { createHmac, randomUUID } from "node:crypto";
import path from "node:path";

import { MediaCategory, MediaVisibility } from "@prisma/client";

import { Errors } from "./errors";

type MediaCategoryConfig = {
  visibility: MediaVisibility;
  bucket: string;
  maxSizeBytes: number;
  mimePatterns: RegExp[];
  kind: "image" | "video" | "document" | "file";
};

const hasProtocol = (value: string): boolean => /^https?:\/\//i.test(value);

const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, "");

const mediaCategoryConfig: Record<MediaCategory, MediaCategoryConfig> = {
  [MediaCategory.avatar]: {
    visibility: MediaVisibility.PUBLIC,
    bucket: "avatars",
    maxSizeBytes: 5 * 1024 * 1024,
    mimePatterns: [/^image\/(jpeg|png|webp)$/i],
    kind: "image"
  },
  [MediaCategory.portfolio_image]: {
    visibility: MediaVisibility.PUBLIC,
    bucket: "portfolio",
    maxSizeBytes: 50 * 1024 * 1024,
    mimePatterns: [/^image\/(jpeg|png|webp)$/i],
    kind: "image"
  },
  [MediaCategory.portfolio_video]: {
    visibility: MediaVisibility.PUBLIC,
    bucket: "portfolio",
    maxSizeBytes: 200 * 1024 * 1024,
    mimePatterns: [/^video\/mp4$/i],
    kind: "video"
  },
  [MediaCategory.post_image]: {
    visibility: MediaVisibility.PUBLIC,
    bucket: "post-media",
    maxSizeBytes: 50 * 1024 * 1024,
    mimePatterns: [/^image\/(jpeg|png|webp)$/i],
    kind: "image"
  },
  [MediaCategory.post_video]: {
    visibility: MediaVisibility.PUBLIC,
    bucket: "post-media",
    maxSizeBytes: 200 * 1024 * 1024,
    mimePatterns: [/^video\/mp4$/i],
    kind: "video"
  },
  [MediaCategory.certification]: {
    visibility: MediaVisibility.PRIVATE,
    bucket: "certifications",
    maxSizeBytes: 20 * 1024 * 1024,
    mimePatterns: [/^image\/(jpeg|png)$/i, /^application\/pdf$/i],
    kind: "document"
  },
  [MediaCategory.chat_attachment]: {
    visibility: MediaVisibility.PRIVATE,
    bucket: "chat-attachments",
    maxSizeBytes: 25 * 1024 * 1024,
    mimePatterns: [
      /^image\/.+$/i,
      /^application\/pdf$/i,
      /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i,
      /^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet$/i,
      /^application\/msword$/i,
      /^application\/vnd\.ms-excel$/i,
      /^text\/plain$/i,
      /^text\/csv$/i
    ],
    kind: "file"
  },
  [MediaCategory.verification_doc]: {
    visibility: MediaVisibility.PRIVATE,
    bucket: "verification-docs",
    maxSizeBytes: 20 * 1024 * 1024,
    mimePatterns: [/^image\/(jpeg|png)$/i, /^application\/pdf$/i],
    kind: "document"
  }
};

const mimeExtensions: Record<string, string> = {
  "application/json": "json",
  "application/ms-excel": "xls",
  "application/msword": "doc",
  "application/octet-stream": "bin",
  "application/pdf": "pdf",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
  "text/csv": "csv",
  "text/plain": "txt",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm"
};

const getMediaCategoryConfig = (category: MediaCategory): MediaCategoryConfig => mediaCategoryConfig[category];

const resolveMediaUrl = (mediaRef: string): string => {
  const normalizedRef = mediaRef.trim();

  if (!normalizedRef || hasProtocol(normalizedRef)) {
    return normalizedRef;
  }

  const cdnBaseUrl = process.env.CDN_BASE_URL?.trim();

  if (!cdnBaseUrl) {
    return normalizedRef;
  }

  return `${trimSlashes(cdnBaseUrl)}/${trimSlashes(normalizedRef)}`;
};

const normalizePrivateMediaRef = (mediaRef: string): string => mediaRef.trim();

const inferMimeTypeFromRef = (mediaRef: string): string => {
  const cleanValue = mediaRef.trim().split("?")[0] ?? "";
  const extension = path.extname(cleanValue).slice(1).toLowerCase();

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "pdf":
      return "application/pdf";
    case "txt":
      return "text/plain";
    case "csv":
      return "text/csv";
    case "json":
      return "application/json";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    default:
      return "application/octet-stream";
  }
};

const isMimeTypeAllowed = (category: MediaCategory, mimeType: string): boolean =>
  getMediaCategoryConfig(category).mimePatterns.some((pattern) => pattern.test(mimeType));

const ensureMediaUploadAllowed = (category: MediaCategory, mimeType: string, sizeBytes: number): void => {
  const config = getMediaCategoryConfig(category);

  if (!isMimeTypeAllowed(category, mimeType)) {
    throw Errors.FILE_UPLOAD_INVALID_TYPE();
  }

  if (sizeBytes > config.maxSizeBytes) {
    throw Errors.FILE_UPLOAD_TOO_LARGE();
  }
};

const guessFileExtension = (mimeType: string, filename?: string): string => {
  const fromFilename = filename?.trim() ? path.extname(filename).slice(1).toLowerCase() : "";

  if (fromFilename) {
    return fromFilename;
  }

  return mimeExtensions[mimeType.toLowerCase()] ?? "bin";
};

const buildStorageKey = (category: MediaCategory, entityId: string, extension: string): string => {
  const config = getMediaCategoryConfig(category);
  const fileName = `${randomUUID()}.${extension.replace(/^\.+/, "") || "bin"}`;

  return `${config.bucket}/${entityId}/${fileName}`;
};

const buildPublicMediaUrl = (storageKey: string): string => resolveMediaUrl(storageKey);

const getReadUrlTtlSeconds = (): number => Number.parseInt(process.env.STORAGE_PRIVATE_READ_URL_TTL_SECONDS ?? "3600", 10);

const getReadUrlSecret = (): string => process.env.STORAGE_SIGNING_SECRET ?? process.env.APP_SECRET ?? "vsp-media-secret";

const getApiBaseUrl = (): string => process.env.APP_BASE_URL ?? `http://localhost:${process.env.PORT ?? "3000"}`;

const buildPrivateMediaSignature = (storageKey: string, expiresAtEpochSeconds: number): string =>
  createHmac("sha256", getReadUrlSecret()).update(`${storageKey}:${expiresAtEpochSeconds}`).digest("hex");

const buildPrivateReadUrl = (storageKey: string, ttlSeconds = getReadUrlTtlSeconds()): string => {
  const expiresAtEpochSeconds = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = buildPrivateMediaSignature(storageKey, expiresAtEpochSeconds);
  const url = new URL("/api/v1/media/private/read", getApiBaseUrl());

  url.searchParams.set("key", storageKey);
  url.searchParams.set("expires", String(expiresAtEpochSeconds));
  url.searchParams.set("signature", signature);

  return url.toString();
};

const verifyPrivateReadUrl = (storageKey: string, expiresAtRaw: string, signature: string): boolean => {
  const expiresAtEpochSeconds = Number.parseInt(expiresAtRaw, 10);

  if (!Number.isFinite(expiresAtEpochSeconds) || expiresAtEpochSeconds < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = buildPrivateMediaSignature(storageKey, expiresAtEpochSeconds);
  return expectedSignature === signature;
};

const isUuidLike = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

export {
  buildPrivateReadUrl,
  buildPublicMediaUrl,
  buildStorageKey,
  ensureMediaUploadAllowed,
  getMediaCategoryConfig,
  guessFileExtension,
  inferMimeTypeFromRef,
  isMimeTypeAllowed,
  isUuidLike,
  normalizePrivateMediaRef,
  resolveMediaUrl,
  verifyPrivateReadUrl
};
export type { MediaCategoryConfig };
