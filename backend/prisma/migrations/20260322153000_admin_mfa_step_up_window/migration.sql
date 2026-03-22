ALTER TABLE "user_sessions"
ADD COLUMN "mfaVerifiedAt" TIMESTAMP(3);

UPDATE "user_sessions"
SET "mfaVerifiedAt" = "createdAt"
WHERE "mfaVerified" = true
  AND "mfaVerifiedAt" IS NULL;
