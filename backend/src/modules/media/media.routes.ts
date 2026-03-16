import { Router, raw } from "express";

import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { MediaController } from "./media.controller";
import { ConfirmUploadBody, MediaIdParams, PrivateReadQuery, RequestUploadUrlBody } from "./media.schemas";

const mediaRoutes = Router();
const mediaController = new MediaController();

mediaRoutes.post("/media/upload-url", authenticate, validate(RequestUploadUrlBody, "body"), mediaController.requestUploadUrl);
mediaRoutes.put("/media/mock-upload/:mediaId", raw({ type: "*/*", limit: "210mb" }), validate(MediaIdParams, "params"), mediaController.acceptMockUpload);
mediaRoutes.post("/media/confirm", authenticate, validate(ConfirmUploadBody, "body"), mediaController.confirmUpload);
mediaRoutes.get("/media/:mediaId", authenticate, validate(MediaIdParams, "params"), mediaController.getAsset);
mediaRoutes.get("/media/private/read", validate(PrivateReadQuery, "query"), mediaController.readPrivateMedia);

export { mediaRoutes };
