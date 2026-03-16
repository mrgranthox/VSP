import { z } from "zod";

const MediaIdParams = z.object({
  mediaId: z.string().uuid()
});

const RequestUploadUrlBody = z
  .object({
    category: z.enum([
      "avatar",
      "portfolio_image",
      "portfolio_video",
      "post_image",
      "post_video",
      "certification",
      "chat_attachment",
      "verification_doc"
    ]),
    mimeType: z.string().min(1).max(100),
    sizeBytes: z.number().int().min(1).max(209715200),
    filename: z.string().max(255).optional()
  })
  .strict();

const ConfirmUploadBody = z
  .object({
    mediaId: z.string().uuid()
  })
  .strict();

const PrivateReadQuery = z.object({
  key: z.string().min(1),
  expires: z.string().min(1),
  signature: z.string().min(1)
});

export { ConfirmUploadBody, MediaIdParams, PrivateReadQuery, RequestUploadUrlBody };
