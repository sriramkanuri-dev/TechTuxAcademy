-- Track the last password change so sessions issued before it can be revoked.
-- Additive and nullable: safe to apply to existing production data.
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
