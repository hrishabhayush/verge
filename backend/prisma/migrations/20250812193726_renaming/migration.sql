/*
  Warnings:

  - You are about to drop the column `singature` on the `Payouts` table. All the data in the column will be lost.
  - Added the required column `signature` to the `Payouts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payouts" RENAME COLUMN "singature" TO "signature";