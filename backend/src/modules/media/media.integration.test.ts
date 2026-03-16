process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";
process.env.CDN_BASE_URL = "https://cdn.integration.test";
process.env.APP_BASE_URL = "http://localhost:3000";
process.env.MEDIA_PROCESS_INLINE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";
import { startBackgroundWorkers, stopBackgroundWorkers } from "../../workers";
import { executeNamedJob } from "../../workers/system-jobs";

const api = request(app);
const password = "Change-This-Password-123!";

const buildEmail = (label: string): string => `itest-media-${label}-${randomUUID()}@example.com`;

const login = async (email: string): Promise<string> => {
  const response = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({
    email,
    password
  });

  assert.equal(response.status, 200);
  return response.body.data.tokenPair.accessToken as string;
};

const createUserAndLogin = async (label: string, firstName = "Media", lastName = "Tester") => {
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

const cleanupMediaData = async (): Promise<void> => {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-media-"
      }
    }
  });
};

const uploadAsset = async (
  accessToken: string,
  body: {
    category: "post_image" | "post_video" | "chat_attachment";
    mimeType: string;
    sizeBytes: number;
    filename: string;
  },
  fileBytes: Buffer
) => {
  const requestUploadResponse = await api.post("/api/v1/media/upload-url").set("Authorization", `Bearer ${accessToken}`).send(body);

  assert.equal(requestUploadResponse.status, 201);
  const uploadUrl = new URL(requestUploadResponse.body.data.uploadUrl as string);
  const mediaId = requestUploadResponse.body.data.mediaId as string;

  const uploadResponse = await api
    .put(`${uploadUrl.pathname}${uploadUrl.search}`)
    .set("Content-Type", body.mimeType)
    .send(fileBytes);

  assert.equal(uploadResponse.status, 200);

  return mediaId;
};

const readBinaryResponse = async (pathnameWithSearch: string) =>
  api
    .get(pathnameWithSearch)
    .buffer(true)
    .parse((res, callback) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      res.on("end", () => callback(null, Buffer.concat(chunks)));
      res.on("error", callback);
    });

before(async () => {
  await cleanupMediaData();
});

after(async () => {
  await stopBackgroundWorkers();
  await cleanupMediaData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("media upload flow backs public post media and private chat attachments", async () => {
  const actor = await createUserAndLogin("actor", "Actor", "Media");
  const peer = await createUserAndLogin("peer", "Peer", "Media");

  const postMediaId = await uploadAsset(
    actor.accessToken,
    {
      category: "post_image",
      mimeType: "image/png",
      sizeBytes: 10,
      filename: "job.png"
    },
    Buffer.from("mock-image")
  );

  const confirmPostMediaResponse = await api.post("/api/v1/media/confirm").set("Authorization", `Bearer ${actor.accessToken}`).send({
    mediaId: postMediaId
  });

  assert.equal(confirmPostMediaResponse.status, 200);
  assert.equal(confirmPostMediaResponse.body.data.status, "READY");
  const postMediaUrl = confirmPostMediaResponse.body.data.finalCdnUrl as string;
  assert.match(postMediaUrl, /^https:\/\/cdn\.integration\.test\/post-media\//);

  const createPostResponse = await api.post("/api/v1/posts").set("Authorization", `Bearer ${actor.accessToken}`).send({
    body: "Media-backed post",
    visibility: "PUBLIC",
    mediaRefs: [postMediaId]
  });

  assert.equal(createPostResponse.status, 201);
  assert.equal(createPostResponse.body.data.media[0].mediaUrl, postMediaUrl);

  const chatAttachmentId = await uploadAsset(
    actor.accessToken,
    {
      category: "chat_attachment",
      mimeType: "application/pdf",
      sizeBytes: 13,
      filename: "manual.pdf"
    },
    Buffer.from("%PDF-1.4\nmock")
  );

  const confirmChatAttachmentResponse = await api.post("/api/v1/media/confirm").set("Authorization", `Bearer ${actor.accessToken}`).send({
    mediaId: chatAttachmentId
  });

  assert.equal(confirmChatAttachmentResponse.status, 200);
  assert.equal(confirmChatAttachmentResponse.body.data.status, "READY");
  assert.equal(typeof confirmChatAttachmentResponse.body.data.readUrl, "string");

  const createConversationResponse = await api.post("/api/v1/conversations").set("Authorization", `Bearer ${actor.accessToken}`).send({
    type: "DIRECT",
    participantIds: [peer.userId]
  });

  assert.equal(createConversationResponse.status, 201);
  const conversationId = createConversationResponse.body.data.id as string;

  const sendMessageResponse = await api
    .post(`/api/v1/conversations/${conversationId}/messages`)
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .send({
      clientMessageId: randomUUID(),
      messageType: "FILE",
      attachmentUploadRefs: [chatAttachmentId]
    });

  assert.equal(sendMessageResponse.status, 201);
  const signedAttachmentUrl = sendMessageResponse.body.data.attachments[0].fileUrl as string;
  const parsedSignedAttachmentUrl = new URL(signedAttachmentUrl);
  assert.equal(parsedSignedAttachmentUrl.pathname, "/api/v1/media/private/read");

  const downloadResponse = await readBinaryResponse(`${parsedSignedAttachmentUrl.pathname}${parsedSignedAttachmentUrl.search}`);

  assert.equal(downloadResponse.status, 200);
  assert.equal((downloadResponse.body as Buffer).toString("utf8"), "%PDF-1.4\nmock");
});

test("queued media processing and pending upload cleanup both work", async () => {
  const previousInlineSetting = process.env.MEDIA_PROCESS_INLINE;
  process.env.MEDIA_PROCESS_INLINE = "false";
  await startBackgroundWorkers({ registerSchedulers: false });

  try {
    const actor = await createUserAndLogin("queue", "Queue", "Worker");

    const queuedMediaId = await uploadAsset(
      actor.accessToken,
      {
        category: "post_video",
        mimeType: "video/mp4",
        sizeBytes: 10,
        filename: "clip.mp4"
      },
      Buffer.from("mock-video")
    );

    const confirmResponse = await api.post("/api/v1/media/confirm").set("Authorization", `Bearer ${actor.accessToken}`).send({
      mediaId: queuedMediaId
    });

    assert.equal(confirmResponse.status, 200);
    assert.equal(["PROCESSING", "READY"].includes(confirmResponse.body.data.status as string), true);

    let latestStatus = confirmResponse.body.data.status as string;

    for (let attempt = 0; attempt < 25 && latestStatus !== "READY"; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const getAssetResponse = await api
        .get(`/api/v1/media/${queuedMediaId}`)
        .set("Authorization", `Bearer ${actor.accessToken}`);

      assert.equal(getAssetResponse.status, 200);
      latestStatus = getAssetResponse.body.data.status as string;
    }

    assert.equal(latestStatus, "READY");

    const requestPendingUploadResponse = await api.post("/api/v1/media/upload-url").set("Authorization", `Bearer ${actor.accessToken}`).send({
      category: "post_image",
      mimeType: "image/png",
      sizeBytes: 10,
      filename: "old.png"
    });

    assert.equal(requestPendingUploadResponse.status, 201);
    const staleMediaId = requestPendingUploadResponse.body.data.mediaId as string;

    await prisma.mediaAsset.update({
      where: {
        id: staleMediaId
      },
      data: {
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    });

    await executeNamedJob("pending_media_cleanup", {});

    const staleAssetResponse = await api.get(`/api/v1/media/${staleMediaId}`).set("Authorization", `Bearer ${actor.accessToken}`);
    assert.equal(staleAssetResponse.status, 200);
    assert.equal(staleAssetResponse.body.data.status, "EXPIRED");
  } finally {
    process.env.MEDIA_PROCESS_INLINE = previousInlineSetting;
    await stopBackgroundWorkers();
  }
});
