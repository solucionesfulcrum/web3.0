-- Additive retry protection. Existing leads keep NULL requestId.
BEGIN;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "requestId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Lead_requestId_key" ON "Lead"("requestId");
COMMIT;
