process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { RequestStatus, UserStatus, VerificationStatus } from "@prisma/client";
import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";

const api = request(app);
const password = "Change-This-Password-123!";

const buildEmail = (label: string): string => `itest-chat-${label}-${randomUUID()}@example.com`;

const login = async (email: string): Promise<string> => {
  const response = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({
    email,
    password
  });

  assert.equal(response.status, 200);
  return response.body.data.tokenPair.accessToken as string;
};

const createUserAndLogin = async (label: string, firstName = "Chat", lastName = "Tester") => {
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

const cleanupChatData = async (): Promise<void> => {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-chat-"
      }
    }
  });
};

before(async () => {
  await cleanupChatData();
});

after(async () => {
  await cleanupChatData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("chat direct and support flows cover dedupe, unread count, attachments, and participant gating", async () => {
  const actor = await createUserAndLogin("actor", "Actor", "Chat");
  const peer = await createUserAndLogin("peer", "Peer", "Chat");
  const outsider = await createUserAndLogin("outsider", "Outsider", "Chat");

  const createDirectResponse = await api.post("/api/v1/conversations").set("Authorization", `Bearer ${actor.accessToken}`).send({
    type: "DIRECT",
    participantIds: [peer.userId]
  });

  assert.equal(createDirectResponse.status, 201);
  const directConversationId = createDirectResponse.body.data.id as string;
  assert.equal(createDirectResponse.body.data.participants.length, 2);

  const recreateDirectResponse = await api.post("/api/v1/conversations").set("Authorization", `Bearer ${actor.accessToken}`).send({
    type: "DIRECT",
    participantIds: [peer.userId]
  });

  assert.equal(recreateDirectResponse.status, 200);
  assert.equal(recreateDirectResponse.body.data.id, directConversationId);

  const peerConversationResponse = await api
    .get(`/api/v1/conversations/${directConversationId}`)
    .set("Authorization", `Bearer ${peer.accessToken}`);

  assert.equal(peerConversationResponse.status, 200);

  const outsiderConversationResponse = await api
    .get(`/api/v1/conversations/${directConversationId}`)
    .set("Authorization", `Bearer ${outsider.accessToken}`);

  assert.equal(outsiderConversationResponse.status, 403);
  assert.equal(outsiderConversationResponse.body.error.code, "CONVERSATION_ACCESS_DENIED");

  const clientMessageId = randomUUID();
  const sendMessageResponse = await api
    .post(`/api/v1/conversations/${directConversationId}/messages`)
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .send({
      clientMessageId,
      messageType: "TEXT",
      body: "<b>Hello</b> peer"
    });

  assert.equal(sendMessageResponse.status, 201);
  const firstMessageId = sendMessageResponse.body.data.id as string;
  assert.equal(sendMessageResponse.body.data.body, "Hello peer");

  const resendMessageResponse = await api
    .post(`/api/v1/conversations/${directConversationId}/messages`)
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .send({
      clientMessageId,
      messageType: "TEXT",
      body: "<b>Hello</b> peer"
    });

  assert.equal(resendMessageResponse.status, 201);
  assert.equal(resendMessageResponse.body.data.id, firstMessageId);

  const getMessagesResponse = await api
    .get(`/api/v1/conversations/${directConversationId}/messages`)
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .query({
      page: 1,
      limit: 20
    });

  assert.equal(getMessagesResponse.status, 200);
  assert.equal(getMessagesResponse.body.data.length, 1);
  assert.equal(getMessagesResponse.body.data[0].body, "Hello peer");

  const unreadBeforeReadResponse = await api.get("/api/v1/inbox/unread-count").set("Authorization", `Bearer ${peer.accessToken}`);
  assert.equal(unreadBeforeReadResponse.status, 200);
  assert.equal(unreadBeforeReadResponse.body.data.count, 1);

  const markReadResponse = await api
    .post(`/api/v1/conversations/${directConversationId}/read`)
    .set("Authorization", `Bearer ${peer.accessToken}`)
    .send({
      lastReadMessageId: firstMessageId
    });

  assert.equal(markReadResponse.status, 200);

  const unreadAfterReadResponse = await api.get("/api/v1/inbox/unread-count").set("Authorization", `Bearer ${peer.accessToken}`);
  assert.equal(unreadAfterReadResponse.status, 200);
  assert.equal(unreadAfterReadResponse.body.data.count, 0);

  const addAttachmentResponse = await api
    .post(`/api/v1/conversations/${directConversationId}/messages/${firstMessageId}/attachments`)
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .send({
      mediaRef: "private/chat/hello.pdf"
    });

  assert.equal(addAttachmentResponse.status, 200);

  const messagesWithAttachmentResponse = await api
    .get(`/api/v1/conversations/${directConversationId}/messages`)
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .query({
      page: 1,
      limit: 20
    });

  assert.equal(messagesWithAttachmentResponse.status, 200);
  assert.equal(messagesWithAttachmentResponse.body.data[0].attachments.length, 1);
  assert.equal(messagesWithAttachmentResponse.body.data[0].attachments[0].mimeType, "application/pdf");

  const createSupportResponse = await api.post("/api/v1/conversations").set("Authorization", `Bearer ${actor.accessToken}`).send({
    type: "SUPPORT",
    participantIds: [peer.userId]
  });

  assert.equal(createSupportResponse.status, 201);
  const supportConversationId = createSupportResponse.body.data.id as string;

  const addParticipantResponse = await api
    .post(`/api/v1/conversations/${supportConversationId}/participants`)
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .send({
      userId: outsider.userId
    });

  assert.equal(addParticipantResponse.status, 200);

  const sendFileMessageResponse = await api
    .post(`/api/v1/conversations/${supportConversationId}/messages`)
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .send({
      clientMessageId: randomUUID(),
      messageType: "FILE",
      attachmentUploadRefs: ["private/chat/manual.docx"]
    });

  assert.equal(sendFileMessageResponse.status, 201);
  const secondMessageId = sendFileMessageResponse.body.data.id as string;
  assert.equal(sendFileMessageResponse.body.data.attachments.length, 1);
  assert.equal(sendFileMessageResponse.body.data.attachments[0].mimeType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

  const outsiderUnreadResponse = await api.get("/api/v1/inbox/unread-count").set("Authorization", `Bearer ${outsider.accessToken}`);
  assert.equal(outsiderUnreadResponse.status, 200);
  assert.equal(outsiderUnreadResponse.body.data.count, 1);

  const afterCursorMessagesResponse = await api
    .get(`/api/v1/conversations/${supportConversationId}/messages`)
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .query({
      after: secondMessageId,
      page: 1,
      limit: 20
    });

  assert.equal(afterCursorMessagesResponse.status, 200);
  assert.equal(afterCursorMessagesResponse.body.data.length, 0);

  const removeParticipantResponse = await api
    .delete(`/api/v1/conversations/${supportConversationId}/participants/${outsider.userId}`)
    .set("Authorization", `Bearer ${actor.accessToken}`);

  assert.equal(removeParticipantResponse.status, 200);

  const outsiderAfterRemovalResponse = await api
    .get(`/api/v1/conversations/${supportConversationId}`)
    .set("Authorization", `Bearer ${outsider.accessToken}`);

  assert.equal(outsiderAfterRemovalResponse.status, 403);
  assert.equal(outsiderAfterRemovalResponse.body.error.code, "CONVERSATION_ACCESS_DENIED");

  const conversationsResponse = await api.get("/api/v1/conversations").set("Authorization", `Bearer ${actor.accessToken}`).query({
    page: 1,
    limit: 20
  });

  assert.equal(conversationsResponse.status, 200);
  assert.equal(conversationsResponse.body.data.length >= 2, true);
});

test("service request conversations only allow request-related participants", async () => {
  const customer = await createUserAndLogin("customer", "Customer", "Chat");
  const worker = await createUserAndLogin("worker", "Worker", "Chat");
  const workerProfile = await prisma.workerProfile.create({
    data: {
      userId: worker.userId,
      headline: "Assigned worker",
      verificationStatus: VerificationStatus.APPROVED
    }
  });

  const workerAccessToken = worker.accessToken;
  const unrelated = await createUserAndLogin("unrelated", "Unrelated", "Chat");

  const serviceRequest = await prisma.serviceRequest.create({
    data: {
      customerUserId: customer.userId,
      preferredWorkerProfileId: workerProfile.id,
      title: "Need help with plumbing",
      description: "Create a service request conversation for chat testing",
      status: RequestStatus.OPEN,
      assignments: {
        create: {
          workerProfileId: workerProfile.id
        }
      }
    }
  });

  const createConversationResponse = await api
    .post("/api/v1/conversations")
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      type: "SERVICE_REQUEST",
      participantIds: [worker.userId],
      serviceRequestId: serviceRequest.id
    });

  assert.equal(createConversationResponse.status, 201);
  const conversationId = createConversationResponse.body.data.id as string;
  assert.equal(createConversationResponse.body.data.serviceRequestId, serviceRequest.id);

  const workerConversationResponse = await api
    .get(`/api/v1/conversations/${conversationId}`)
    .set("Authorization", `Bearer ${workerAccessToken}`);

  assert.equal(workerConversationResponse.status, 200);

  const unrelatedCreateResponse = await api
    .post("/api/v1/conversations")
    .set("Authorization", `Bearer ${unrelated.accessToken}`)
    .send({
      type: "SERVICE_REQUEST",
      participantIds: [customer.userId],
      serviceRequestId: serviceRequest.id
    });

  assert.equal(unrelatedCreateResponse.status, 403);
  assert.equal(unrelatedCreateResponse.body.error.code, "PERMISSION_DENIED");
});
