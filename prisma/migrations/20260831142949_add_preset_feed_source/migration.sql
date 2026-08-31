-- AlterTable
ALTER TABLE "PresetFeed" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'legacy',
ALTER COLUMN "category" SET DEFAULT '';
