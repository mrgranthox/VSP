process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";
process.env.CDN_BASE_URL = "https://cdn.integration.test";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { UserStatus, VerificationStatus } from "@prisma/client";
import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";

const api = request(app);
const password = "Change-This-Password-123!";

const buildEmail = (label: string): string => `itest-social-${label}-${randomUUID()}@example.com`;
const buildSlug = (label: string): string => `itest-social-${label}-${randomUUID().slice(0, 8)}`;

const login = async (email: string): Promise<string> => {
  const response = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({
    email,
    password
  });

  assert.equal(response.status, 200);
  return response.body.data.tokenPair.accessToken as string;
};

const createUserAndLogin = async (label: string, firstName = "Social", lastName = "Tester") => {
  const email = buildEmail(label);

  const registerResponse = await api.post("/api/v1/auth/register").send({
    email,
    password,
    firstName,
    lastName
  });

  assert.equal(registerResponse.status, 201);

  return {
    email,
    userId: registerResponse.body.data.userId as string,
    accessToken: await login(email)
  };
};

const cleanupSocialData = async (): Promise<void> => {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-social-"
      }
    }
  });

  await prisma.cityConfig.deleteMany({
    where: {
      slug: {
        startsWith: "itest-social-"
      }
    }
  });
};

before(async () => {
  await cleanupSocialData();
});

after(async () => {
  await cleanupSocialData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("social module covers feed visibility, media, likes, comments, reports, and soft delete", async () => {
  const actor = await createUserAndLogin("actor", "Actor", "User");
  const followedAuthor = await createUserAndLogin("followed", "Followed", "Author");
  const workerAuthor = await createUserAndLogin("worker", "Worker", "Author");
  const cityAuthor = await createUserAndLogin("city", "City", "Author");
  const strangerAuthor = await createUserAndLogin("stranger", "Stranger", "Author");

  const city = await prisma.cityConfig.create({
    data: {
      slug: buildSlug("accra"),
      name: "Accra",
      countryCode: "GH",
      currencyCode: "GHS",
      timezone: "Africa/Accra",
      defaultSearchRadiusKm: 25,
      isEnabled: true
    }
  });

  await Promise.all([
    prisma.userProfile.update({
      where: {
        userId: actor.userId
      },
      data: {
        cityId: city.id
      }
    }),
    prisma.userProfile.update({
      where: {
        userId: cityAuthor.userId
      },
      data: {
        cityId: city.id
      }
    }),
    prisma.userProfile.update({
      where: {
        userId: followedAuthor.userId
      },
      data: {
        cityId: city.id
      }
    })
  ]);

  const workerProfile = await prisma.workerProfile.create({
    data: {
      userId: workerAuthor.userId,
      headline: "Verified worker",
      verificationStatus: VerificationStatus.APPROVED
    }
  });

  const followUserResponse = await api.post("/api/v1/users/me/follows").set("Authorization", `Bearer ${actor.accessToken}`).send({
    targetType: "USER",
    targetId: followedAuthor.userId
  });
  assert.equal(followUserResponse.status, 200);

  const followWorkerResponse = await api.post("/api/v1/users/me/follows").set("Authorization", `Bearer ${actor.accessToken}`).send({
    targetType: "WORKER",
    targetId: workerProfile.id
  });
  assert.equal(followWorkerResponse.status, 200);

  const followedPostResponse = await api.post("/api/v1/posts").set("Authorization", `Bearer ${followedAuthor.accessToken}`).send({
    body: " <p>Followed author update</p> ",
    visibility: "PUBLIC",
    mediaRefs: ["posts/followed-update.jpg"]
  });

  assert.equal(followedPostResponse.status, 201);
  const followedPostId = followedPostResponse.body.data.id as string;
  assert.equal(followedPostResponse.body.data.body, "Followed author update");
  assert.equal(followedPostResponse.body.data.media[0].mediaUrl, "https://cdn.integration.test/posts/followed-update.jpg");

  const workerPostResponse = await api.post("/api/v1/posts").set("Authorization", `Bearer ${workerAuthor.accessToken}`).send({
    body: "Workers-only connection post",
    visibility: "CONNECTIONS"
  });

  assert.equal(workerPostResponse.status, 201);
  const workerPostId = workerPostResponse.body.data.id as string;

  const cityPostResponse = await api.post("/api/v1/posts").set("Authorization", `Bearer ${cityAuthor.accessToken}`).send({
    body: "Public city announcement",
    visibility: "PUBLIC"
  });

  assert.equal(cityPostResponse.status, 201);
  const cityPostId = cityPostResponse.body.data.id as string;

  const strangerPostResponse = await api.post("/api/v1/posts").set("Authorization", `Bearer ${strangerAuthor.accessToken}`).send({
    body: "Private stranger note",
    visibility: "PRIVATE"
  });

  assert.equal(strangerPostResponse.status, 201);
  const strangerPostId = strangerPostResponse.body.data.id as string;

  const actorOwnPostResponse = await api.post("/api/v1/posts").set("Authorization", `Bearer ${actor.accessToken}`).send({
    body: "<strong>Actor</strong> post",
    visibility: "PRIVATE"
  });

  assert.equal(actorOwnPostResponse.status, 201);
  const actorOwnPostId = actorOwnPostResponse.body.data.id as string;

  const feedResponse = await api.get("/api/v1/posts").set("Authorization", `Bearer ${actor.accessToken}`).query({
    page: 1,
    limit: 20
  });

  assert.equal(feedResponse.status, 200);
  const feedIds = feedResponse.body.data.map((post: { id: string }) => post.id);
  assert.equal(feedIds.includes(followedPostId), true);
  assert.equal(feedIds.includes(workerPostId), true);
  assert.equal(feedIds.includes(cityPostId), true);
  assert.equal(feedIds.includes(actorOwnPostId), true);
  assert.equal(feedIds.includes(strangerPostId), false);

  const publicFeedResponse = await api.get("/api/v1/posts").query({
    page: 1,
    limit: 20
  });

  assert.equal(publicFeedResponse.status, 200);
  const publicFeedIds = publicFeedResponse.body.data.map((post: { id: string }) => post.id);
  assert.equal(publicFeedIds.includes(followedPostId), true);
  assert.equal(publicFeedIds.includes(cityPostId), true);
  assert.equal(publicFeedIds.includes(workerPostId), false);
  assert.equal(publicFeedIds.includes(actorOwnPostId), false);

  const getWorkerPostAsActor = await api.get(`/api/v1/posts/${workerPostId}`).set("Authorization", `Bearer ${actor.accessToken}`);
  assert.equal(getWorkerPostAsActor.status, 200);

  const getWorkerPostAnonymous = await api.get(`/api/v1/posts/${workerPostId}`);
  assert.equal(getWorkerPostAnonymous.status, 404);

  const selfLikeResponse = await api.post(`/api/v1/posts/${actorOwnPostId}/likes`).set("Authorization", `Bearer ${actor.accessToken}`).send({});
  assert.equal(selfLikeResponse.status, 403);

  const likeFollowedPostResponse = await api.post(`/api/v1/posts/${followedPostId}/likes`).set("Authorization", `Bearer ${actor.accessToken}`).send({});
  assert.equal(likeFollowedPostResponse.status, 200);

  const saveFollowedPostResponse = await api.post(`/api/v1/posts/${followedPostId}/saves`).set("Authorization", `Bearer ${actor.accessToken}`).send({});
  assert.equal(saveFollowedPostResponse.status, 200);

  const addedMediaId = randomUUID();
  const addMediaResponse = await api
    .post(`/api/v1/posts/${actorOwnPostId}/media/${addedMediaId}`)
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .send({
      mediaRef: "posts/actor-extra.mp4",
      mediaType: "video"
    });

  assert.equal(addMediaResponse.status, 200);

  const actorPostWithMedia = await api.get(`/api/v1/posts/${actorOwnPostId}`).set("Authorization", `Bearer ${actor.accessToken}`);
  assert.equal(actorPostWithMedia.status, 200);
  assert.equal(actorPostWithMedia.body.data.media.some((item: { id: string }) => item.id === addedMediaId), true);

  const commentResponse = await api
    .post(`/api/v1/posts/${followedPostId}/comments`)
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .send({
      body: "<p>Main comment</p>"
    });

  assert.equal(commentResponse.status, 201);
  const topLevelCommentId = commentResponse.body.data.id as string;
  assert.equal(commentResponse.body.data.body, "Main comment");

  const replyResponse = await api
    .post(`/api/v1/posts/${followedPostId}/comments`)
    .set("Authorization", `Bearer ${followedAuthor.accessToken}`)
    .send({
      body: "Reply comment",
      parentCommentId: topLevelCommentId
    });

  assert.equal(replyResponse.status, 201);
  const replyCommentId = replyResponse.body.data.id as string;

  const nestedReplyResponse = await api
    .post(`/api/v1/posts/${followedPostId}/comments`)
    .set("Authorization", `Bearer ${workerAuthor.accessToken}`)
    .send({
      body: "Reply to reply should fail",
      parentCommentId: replyCommentId
    });

  assert.equal(nestedReplyResponse.status, 422);

  const likeCommentResponse = await api.post(`/api/v1/comments/${topLevelCommentId}/likes`).set("Authorization", `Bearer ${followedAuthor.accessToken}`).send({});
  assert.equal(likeCommentResponse.status, 200);

  const listCommentsResponse = await api
    .get(`/api/v1/posts/${followedPostId}/comments`)
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .query({
      page: 1,
      limit: 20
    });

  assert.equal(listCommentsResponse.status, 200);
  assert.equal(listCommentsResponse.body.data.length, 1);
  assert.equal(listCommentsResponse.body.data[0].replies.length, 1);
  assert.equal(listCommentsResponse.body.data[0].replies[0].id, replyCommentId);

  const updateCommentResponse = await api.patch(`/api/v1/comments/${topLevelCommentId}`).set("Authorization", `Bearer ${actor.accessToken}`).send({
    body: "Updated comment body"
  });

  assert.equal(updateCommentResponse.status, 200);
  assert.equal(updateCommentResponse.body.data.body, "Updated comment body");

  const reportCommentResponse = await api.post(`/api/v1/comments/${replyCommentId}/reports`).set("Authorization", `Bearer ${actor.accessToken}`).send({
    reason: "Spam and abusive language",
    severity: "HIGH"
  });

  assert.equal(reportCommentResponse.status, 201);

  const [commentReportCount, moderationReport] = await Promise.all([
    prisma.commentReport.count({
      where: {
        commentId: replyCommentId,
        reporterUserId: actor.userId
      }
    }),
    prisma.report.findFirst({
      where: {
        entityType: "COMMENT",
        entityId: replyCommentId,
        reporterUserId: actor.userId
      }
    })
  ]);

  assert.equal(commentReportCount, 1);
  assert.equal(moderationReport?.severity, "HIGH");

  const removeMediaResponse = await api
    .delete(`/api/v1/posts/${actorOwnPostId}/media/${addedMediaId}`)
    .set("Authorization", `Bearer ${actor.accessToken}`);

  assert.equal(removeMediaResponse.status, 200);

  const deleteReplyResponse = await api.delete(`/api/v1/comments/${replyCommentId}`).set("Authorization", `Bearer ${followedAuthor.accessToken}`);
  assert.equal(deleteReplyResponse.status, 200);

  const commentsAfterDeleteResponse = await api
    .get(`/api/v1/posts/${followedPostId}/comments`)
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .query({
      page: 1,
      limit: 20
    });

  assert.equal(commentsAfterDeleteResponse.status, 200);
  assert.equal(commentsAfterDeleteResponse.body.data[0].replies.length, 0);

  const deletePostResponse = await api.delete(`/api/v1/posts/${actorOwnPostId}`).set("Authorization", `Bearer ${actor.accessToken}`);
  assert.equal(deletePostResponse.status, 200);

  const deletedPostFetchResponse = await api.get(`/api/v1/posts/${actorOwnPostId}`).set("Authorization", `Bearer ${actor.accessToken}`);
  assert.equal(deletedPostFetchResponse.status, 404);

  const followedPostDetailsResponse = await api.get(`/api/v1/posts/${followedPostId}`).set("Authorization", `Bearer ${actor.accessToken}`);
  assert.equal(followedPostDetailsResponse.status, 200);
  assert.equal(followedPostDetailsResponse.body.data.likeCount, 1);
  assert.equal(followedPostDetailsResponse.body.data.saveCount, 1);
  assert.equal(followedPostDetailsResponse.body.data.isLikedByViewer, true);
  assert.equal(followedPostDetailsResponse.body.data.isSavedByViewer, true);
});
