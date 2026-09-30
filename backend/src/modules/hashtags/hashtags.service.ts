import { ApiError } from "../../lib/errors";
import type { ActorContext } from "../../types/actor";
import { HashtagsRepository } from "./hashtags.repository";

export class HashtagsService {
  constructor(private readonly repository: HashtagsRepository = new HashtagsRepository()) {}

  async getTrending(limit = 10) {
    return this.repository.getTrending(limit);
  }

  async getHashtagFeed(tag: string, page = 1, limit = 20) {
    return this.repository.getHashtagFeed(tag, page, limit);
  }

  async followHashtag(actor: ActorContext, tag: string) {
    const hashtag = await this.repository.findByTag(tag);
    if (!hashtag) {
      throw new ApiError("NOT_FOUND", 404, "Hashtag not found");
    }
    try {
      return await this.repository.follow(hashtag.id, actor.userId);
    } catch {
      return { alreadyFollowing: true };
    }
  }

  async unfollowHashtag(actor: ActorContext, tag: string) {
    const hashtag = await this.repository.findByTag(tag);
    if (!hashtag) {
      throw new ApiError("NOT_FOUND", 404, "Hashtag not found");
    }
    return this.repository.unfollow(hashtag.id, actor.userId);
  }
}
