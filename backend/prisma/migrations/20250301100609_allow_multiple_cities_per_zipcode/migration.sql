/*
  Warnings:

  - A unique constraint covering the columns `[zipCode,city]` on the table `ZipCode` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ZipCode_zipCode_key";

-- CreateIndex
CREATE UNIQUE INDEX "ZipCode_zipCode_city_key" ON "ZipCode"("zipCode", "city");
