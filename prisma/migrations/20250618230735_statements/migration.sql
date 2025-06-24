/*
  Warnings:

  - You are about to drop the column `statementName` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `statementPath` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `statementName` on the `Debt` table. All the data in the column will be lost.
  - You are about to drop the column `statementPath` on the `Debt` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "statementName",
DROP COLUMN "statementPath",
ADD COLUMN     "statementId" TEXT;

-- AlterTable
ALTER TABLE "Debt" DROP COLUMN "statementName",
DROP COLUMN "statementPath",
ADD COLUMN     "statementId" TEXT;

-- CreateTable
CREATE TABLE "Statement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "brokerageCompany" TEXT,
    "parsedData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Statement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Statement_filePath_key" ON "Statement"("filePath");

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
