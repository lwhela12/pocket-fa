-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "statementName" TEXT,
ADD COLUMN     "statementPath" TEXT;

-- AlterTable
ALTER TABLE "Debt" ADD COLUMN     "statementName" TEXT,
ADD COLUMN     "statementPath" TEXT;
