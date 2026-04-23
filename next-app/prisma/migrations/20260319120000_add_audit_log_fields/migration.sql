-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN "entity" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "entity_id" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "ip_address" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "user_agent" TEXT;
