process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";
process.env.CDN_BASE_URL = "https://cdn.integration.test";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { VerificationStatus } from "@prisma/client";
import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";

const api = request(app);
const password = "Change-This-Password-123!";

const buildEmail = (label: string): string => `itest-worker-${label}-${randomUUID()}@example.com`;
const buildSlug = (label: string): string => `itest-worker-${label}-${randomUUID().slice(0, 8)}`;

const login = async (email: string): Promise<string> => {
  const response = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({
    email,
    password
  });

  assert.equal(response.status, 200);
  return response.body.data.tokenPair.accessToken as string;
};

const createUserAndLogin = async (label: string) => {
  const email = buildEmail(label);

  const registerResponse = await api.post("/api/v1/auth/register").send({
    email,
    password,
    firstName: "Worker",
    lastName: "Tester"
  });

  assert.equal(registerResponse.status, 201);

  return {
    email,
    accessToken: await login(email)
  };
};

const cleanupWorkerData = async (): Promise<void> => {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-worker-"
      }
    }
  });

  await prisma.tradeCategory.deleteMany({
    where: {
      slug: {
        startsWith: "itest-worker-"
      }
    }
  });

  await prisma.cityConfig.deleteMany({
    where: {
      slug: {
        startsWith: "itest-worker-"
      }
    }
  });
};

before(async () => {
  await cleanupWorkerData();
});

after(async () => {
  await cleanupWorkerData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("worker profile flow covers create, nested resources, public profile filtering, and verification submit", async () => {
  const { accessToken } = await createUserAndLogin("profile");

  const trade = await prisma.tradeCategory.create({
    data: {
      slug: buildSlug("trade"),
      name: "Integration Electrician",
      isEnabled: true
    }
  });

  const city = await prisma.cityConfig.create({
    data: {
      slug: buildSlug("city"),
      name: "Integration City",
      countryCode: "GH",
      currencyCode: "GHS",
      timezone: "Africa/Accra",
      defaultSearchRadiusKm: 15,
      isEnabled: true
    }
  });

  const createProfileResponse = await api.post("/api/v1/worker-profiles").set("Authorization", `Bearer ${accessToken}`).send({
    headline: " <b>Certified Builder</b> ",
    bio: "<p>Experienced <strong>worker</strong> ready for projects.</p>",
    experienceYears: 8
  });

  assert.equal(createProfileResponse.status, 201);
  const workerProfileId = createProfileResponse.body.data.id as string;
  assert.equal(createProfileResponse.body.data.headline, "Certified Builder");
  assert.equal(createProfileResponse.body.data.bio, "Experienced worker ready for projects.");
  assert.equal(createProfileResponse.body.data.verificationStatus, VerificationStatus.DRAFT);

  const addTradeResponse = await api
    .post(`/api/v1/worker-profiles/me/trades/${trade.id}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({});

  assert.equal(addTradeResponse.status, 200);
  assert.equal(addTradeResponse.body.data.tradeCategory.id, trade.id);

  const createServiceResponse = await api
    .post("/api/v1/worker-profiles/me/services")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      title: "Residential Wiring",
      description: "<b>Install</b> and fix home wiring",
      basePriceMinor: 25000,
      currencyCode: "ghs"
    });

  assert.equal(createServiceResponse.status, 201);
  const serviceId = createServiceResponse.body.data.id as string;
  assert.equal(createServiceResponse.body.data.description, "Install and fix home wiring");
  assert.equal(createServiceResponse.body.data.currencyCode, "GHS");

  const createServiceAreaResponse = await api
    .post("/api/v1/worker-profiles/me/service-areas")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      cityId: city.id,
      radiusKm: 20
    });

  assert.equal(createServiceAreaResponse.status, 201);
  const areaId = createServiceAreaResponse.body.data.id as string;
  assert.equal(createServiceAreaResponse.body.data.city.id, city.id);

  const createAvailabilityRuleResponse = await api
    .post("/api/v1/worker-profiles/me/availability/rules")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      dayOfWeek: 1,
      startMinute: 480,
      endMinute: 1080,
      timezone: "Africa/Accra"
    });

  assert.equal(createAvailabilityRuleResponse.status, 201);
  const ruleId = createAvailabilityRuleResponse.body.data.id as string;

  const createAvailabilityExceptionResponse = await api
    .post("/api/v1/worker-profiles/me/availability/exceptions")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      startsAt: "2026-03-20T08:00:00.000Z",
      endsAt: "2026-03-20T12:00:00.000Z",
      reason: "<i>Already booked</i>"
    });

  assert.equal(createAvailabilityExceptionResponse.status, 201);
  const exceptionId = createAvailabilityExceptionResponse.body.data.id as string;
  assert.equal(createAvailabilityExceptionResponse.body.data.reason, "Already booked");

  const createPortfolioItemResponse = await api
    .post("/api/v1/worker-profiles/me/portfolio")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      title: "Kitchen Rewire",
      caption: "<p>Completed in 2 days</p>",
      mediaRef: "portfolio/kitchen-rewire.jpg",
      sortOrder: 1
    });

  assert.equal(createPortfolioItemResponse.status, 201);
  const portfolioItemId = createPortfolioItemResponse.body.data.id as string;
  assert.equal(createPortfolioItemResponse.body.data.mediaUrl, "https://cdn.integration.test/portfolio/kitchen-rewire.jpg");

  const createCertificationResponse = await api
    .post("/api/v1/worker-profiles/me/certifications")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      title: "Electrical Safety Certification",
      issuer: "Ghana Trade Board",
      mediaRef: "private/certificates/electrical.pdf",
      issuedOn: "2024-01-15",
      expiresOn: "2027-01-15"
    });

  assert.equal(createCertificationResponse.status, 201);
  const certId = createCertificationResponse.body.data.id as string;
  assert.equal(createCertificationResponse.body.data.certificateUrl, "private/certificates/electrical.pdf");

  const updateProfileResponse = await api.patch("/api/v1/worker-profiles/me").set("Authorization", `Bearer ${accessToken}`).send({
    bio: "<div>Updated bio with <strong>sanitized</strong> text.</div>",
    serviceRadiusKm: 25
  });

  assert.equal(updateProfileResponse.status, 200);
  assert.equal(updateProfileResponse.body.data.bio, "Updated bio with sanitized text.");
  assert.equal(updateProfileResponse.body.data.serviceRadiusKm, 25);

  const updateServiceResponse = await api
    .patch(`/api/v1/worker-profiles/me/services/${serviceId}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      isEnabled: false,
      description: "Disabled service"
    });

  assert.equal(updateServiceResponse.status, 200);
  assert.equal(updateServiceResponse.body.data.isEnabled, false);

  const updateServiceAreaResponse = await api
    .patch(`/api/v1/worker-profiles/me/service-areas/${areaId}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      radiusKm: 30,
      coverageMode: "CIRCLE"
    });

  assert.equal(updateServiceAreaResponse.status, 200);
  assert.equal(updateServiceAreaResponse.body.data.radiusKm, 30);

  const updateRuleResponse = await api
    .patch(`/api/v1/worker-profiles/me/availability/rules/${ruleId}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      startMinute: 540,
      endMinute: 1020
    });

  assert.equal(updateRuleResponse.status, 200);
  assert.equal(updateRuleResponse.body.data.startMinute, 540);

  const updateExceptionResponse = await api
    .patch(`/api/v1/worker-profiles/me/availability/exceptions/${exceptionId}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      reason: "Customer rescheduled"
    });

  assert.equal(updateExceptionResponse.status, 200);
  assert.equal(updateExceptionResponse.body.data.reason, "Customer rescheduled");

  const updatePortfolioResponse = await api
    .patch(`/api/v1/worker-profiles/me/portfolio/${portfolioItemId}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      mediaRef: "portfolio/updated-kitchen.jpg",
      caption: "Fresh project photo"
    });

  assert.equal(updatePortfolioResponse.status, 200);
  assert.equal(updatePortfolioResponse.body.data.mediaUrl, "https://cdn.integration.test/portfolio/updated-kitchen.jpg");

  const updateCertificationResponse = await api
    .patch(`/api/v1/worker-profiles/me/certifications/${certId}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      issuer: "Updated Board",
      expiresOn: null
    });

  assert.equal(updateCertificationResponse.status, 200);
  assert.equal(updateCertificationResponse.body.data.issuer, "Updated Board");
  assert.equal(updateCertificationResponse.body.data.expiresOn, null);

  const meResponse = await api.get("/api/v1/worker-profiles/me").set("Authorization", `Bearer ${accessToken}`);
  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.data.tradeCategories.length, 1);
  assert.equal(meResponse.body.data.portfolioItems.length, 1);
  assert.equal(meResponse.body.data.certifications.length, 1);

  const publicProfileResponse = await api.get(`/api/v1/worker-profiles/${workerProfileId}`);
  assert.equal(publicProfileResponse.status, 200);
  assert.equal(publicProfileResponse.body.data.id, workerProfileId);
  assert.equal(publicProfileResponse.body.data.services.length, 0);
  assert.equal(publicProfileResponse.body.data.tradeCategories.length, 1);
  assert.equal(publicProfileResponse.body.data.serviceAreas.length, 1);
  assert.equal(publicProfileResponse.body.data.certifications.length, 1);
  assert.equal("certificateUrl" in publicProfileResponse.body.data.certifications[0], false);
  assert.equal("verificationRequests" in publicProfileResponse.body.data, false);

  const submitVerificationResponse = await api
    .post("/api/v1/worker-profiles/me/verification-requests")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      documentRefs: ["private/certificates/electrical.pdf"],
      notes: "Ready for review"
    });

  assert.equal(submitVerificationResponse.status, 201);
  assert.equal(submitVerificationResponse.body.data.verificationStatus, VerificationStatus.SUBMITTED);
  assert.equal(submitVerificationResponse.body.data.verificationRequests[0].status, VerificationStatus.SUBMITTED);

  const duplicateSubmitResponse = await api
    .post("/api/v1/worker-profiles/me/verification-requests")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      documentRefs: ["private/certificates/electrical.pdf"]
    });

  assert.equal(duplicateSubmitResponse.status, 422);
  assert.equal(duplicateSubmitResponse.body.error.code, "VALIDATION_FAILED");

  const deleteRuleResponse = await api
    .delete(`/api/v1/worker-profiles/me/availability/rules/${ruleId}`)
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(deleteRuleResponse.status, 200);

  const deleteExceptionResponse = await api
    .delete(`/api/v1/worker-profiles/me/availability/exceptions/${exceptionId}`)
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(deleteExceptionResponse.status, 200);

  const deletePortfolioResponse = await api
    .delete(`/api/v1/worker-profiles/me/portfolio/${portfolioItemId}`)
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(deletePortfolioResponse.status, 200);

  const deleteCertificationResponse = await api
    .delete(`/api/v1/worker-profiles/me/certifications/${certId}`)
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(deleteCertificationResponse.status, 200);

  const deleteServiceAreaResponse = await api
    .delete(`/api/v1/worker-profiles/me/service-areas/${areaId}`)
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(deleteServiceAreaResponse.status, 200);

  const deleteServiceResponse = await api
    .delete(`/api/v1/worker-profiles/me/services/${serviceId}`)
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(deleteServiceResponse.status, 200);

  const removeTradeResponse = await api
    .delete(`/api/v1/worker-profiles/me/trades/${trade.id}`)
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(removeTradeResponse.status, 200);
});
