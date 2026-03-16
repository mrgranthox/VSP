import type { Request, Response } from "express";

import { success } from "../../lib/response";
import { MediaService } from "./media.service";

class MediaController {
  constructor(private readonly mediaService: MediaService = new MediaService()) {}

  requestUploadUrl = async (req: Request, res: Response): Promise<void> => {
    const result = await this.mediaService.requestUploadUrl(req.actor!, req.body);

    res.status(201).json(
      success({
        mediaId: result.mediaId,
        uploadUrl: result.uploadUrl,
        uploadMethod: result.uploadMethod,
        expiresAt: result.expiresAt,
        headers: result.headers,
        asset: result.asset
      })
    );
  };

  acceptMockUpload = async (req: Request, res: Response): Promise<void> => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);

    await this.mediaService.acceptMockUpload(req.params.mediaId, token, body);

    res.status(200).end();
  };

  confirmUpload = async (req: Request, res: Response): Promise<void> => {
    const asset = await this.mediaService.confirmUpload(req.actor!, req.body.mediaId);

    res.status(200).json(success(asset));
  };

  getAsset = async (req: Request, res: Response): Promise<void> => {
    const asset = await this.mediaService.getAsset(req.actor!, req.params.mediaId);
    res.status(200).json(success(asset));
  };

  readPrivateMedia = async (req: Request, res: Response): Promise<void> => {
    const { absolutePath } = await this.mediaService.resolvePrivateReadRequest({
      key: typeof req.query.key === "string" ? req.query.key : undefined,
      expires: typeof req.query.expires === "string" ? req.query.expires : undefined,
      signature: typeof req.query.signature === "string" ? req.query.signature : undefined
    });

    res.sendFile(absolutePath);
  };
}

export { MediaController };
