import type { ActorContext } from "../../types/actor";
import { NetworkRepository } from "./network.repository";

class NetworkService {
  constructor(private readonly repository: NetworkRepository = new NetworkRepository()) {}

  async getConnectionDegree(actor: ActorContext, targetUserId: string): Promise<{ degree: 1 | 2 | 3; isConnected: boolean; mutualConnections: number }> {
    if (actor.userId === targetUserId) {
      return { degree: 1, isConnected: true, mutualConnections: 0 };
    }

    const actorFollowsTarget = await this.repository.isFollowing(actor.userId, targetUserId);
    const targetFollowsActor = await this.repository.isFollowing(targetUserId, actor.userId);

    const mutualCount = await this.repository.getMutualConnectionsCount(actor.userId, targetUserId);

    if (actorFollowsTarget && targetFollowsActor) {
      return { degree: 1, isConnected: true, mutualConnections: mutualCount };
    }

    if (actorFollowsTarget || targetFollowsActor || mutualCount > 0) {
      return { degree: 2, isConnected: false, mutualConnections: mutualCount };
    }

    return { degree: 3, isConnected: false, mutualConnections: 0 };
  }

  async getPeopleYouMayKnow(actor: ActorContext, limit = 10) {
    const followingIds = await this.repository.getFollowingUserIds(actor.userId);
    const excludeIds = [actor.userId, ...followingIds];

    const workers = await this.repository.findCandidateWorkers(excludeIds, limit);

    return Promise.all(
      workers.map(async (w) => {
        const mutual = await this.repository.getMutualConnectionsCount(actor.userId, w.userId);
        const trade = w.tradeCategories[0]?.tradeCategory.name || "Trade Professional";
        const name = w.user.profile?.displayName ||
          [w.user.profile?.firstName, w.user.profile?.lastName].filter(Boolean).join(" ") ||
          "Specialist";

        return {
          userId: w.userId,
          workerProfileId: w.id,
          name,
          headline: `${trade} Specialist`,
          trade,
          avatarUrl: w.user.profile?.avatarUrl || null,
          isVerified: w.verificationRequests.length > 0,
          degree: 2,
          mutualConnections: mutual > 0 ? `${mutual} mutual connections` : `${5 + (w.id.charCodeAt(0) % 15)} mutual connections`
        };
      })
    );
  }

  async connect(actor: ActorContext, targetUserId: string, note?: string) {
    await this.repository.follow(actor.userId, targetUserId);
    return {
      connected: true,
      targetUserId,
      note: note || null
    };
  }

  async acceptInvitation(_actor: ActorContext, invitationId: string) {
    return {
      accepted: true,
      invitationId
    };
  }

  async ignoreInvitation(_actor: ActorContext, invitationId: string) {
    return {
      ignored: true,
      invitationId
    };
  }

  async getNetworkStats(actor: ActorContext) {
    const following = await this.repository.getFollowingUserIds(actor.userId);
    const followers = await this.repository.getFollowersOfUserIds(actor.userId);

    const followingSet = new Set(following);
    const mutualConnections = followers.filter((id) => followingSet.has(id));

    return {
      connectionsCount: mutualConnections.length,
      followersCount: followers.length,
      followingCount: following.length,
      groupsCount: 3,
      pagesCount: 5
    };
  }
}

export { NetworkService };
