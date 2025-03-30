-- AlterTable
ALTER TABLE "Letter" ADD COLUMN     "recipientEmail" TEXT,
ADD COLUMN     "recipientFirstName" TEXT,
ADD COLUMN     "recipientLastName" TEXT,
ADD COLUMN     "recipientPhone" TEXT,
ADD COLUMN     "reference" TEXT;
