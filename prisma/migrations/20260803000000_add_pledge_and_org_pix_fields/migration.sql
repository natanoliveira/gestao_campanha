-- CreateEnum
CREATE TYPE "PledgeStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "pixKey" TEXT,
                             ADD COLUMN "whatsapp" TEXT,
                             ADD COLUMN "pixQrCodeUrl" TEXT;

-- CreateTable
CREATE TABLE "pledges" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "initiativeId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "status" "PledgeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pledges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pledges_organizationId_idx" ON "pledges"("organizationId");

-- CreateIndex
CREATE INDEX "pledges_projectId_idx" ON "pledges"("projectId");

-- CreateIndex
CREATE INDEX "pledges_initiativeId_idx" ON "pledges"("initiativeId");

-- CreateIndex
CREATE INDEX "pledges_status_idx" ON "pledges"("status");

-- AddForeignKey
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "initiatives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
