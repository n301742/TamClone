-- AlterTable
ALTER TABLE "Letter" ADD COLUMN     "description" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "isColorPrint" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDuplexPrint" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isExpress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRegistered" BOOLEAN NOT NULL DEFAULT false;
