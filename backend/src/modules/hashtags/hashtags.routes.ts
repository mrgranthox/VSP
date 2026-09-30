import { Router } from "express";

import { authenticate, optionalAuthenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { hashtagsController } from "./hashtags.controller";
import { GetHashtagFeedQuery, TagParam } from "./hashtags.schemas";

const hashtagsRoutes = Router();

hashtagsRoutes.get("/hashtags/trending", hashtagsController.getTrending);
hashtagsRoutes.get("/hashtags/:tag/feed", optionalAuthenticate, validate(TagParam, "params"), validate(GetHashtagFeedQuery, "query"), hashtagsController.getHashtagFeed);
hashtagsRoutes.post("/hashtags/:tag/follow", authenticate, validate(TagParam, "params"), hashtagsController.followHashtag);
hashtagsRoutes.delete("/hashtags/:tag/follow", authenticate, validate(TagParam, "params"), hashtagsController.unfollowHashtag);

export { hashtagsRoutes };
