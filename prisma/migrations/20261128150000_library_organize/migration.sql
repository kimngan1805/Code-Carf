-- CreateEnum
CREATE TYPE "LibraryStatus" AS ENUM ('DRAFT', 'READY', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LibraryVisibility" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "LectureKind" AS ENUM ('VIDEO', 'PDF', 'SLIDE', 'DOC');

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "libraryCategoryId" TEXT,
ADD COLUMN     "libraryStatus" "LibraryStatus" NOT NULL DEFAULT 'READY',
ADD COLUMN     "libraryTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "libraryVisibility" "LibraryVisibility" NOT NULL DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE "LibraryFile" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "kind" "LectureKind" NOT NULL DEFAULT 'PDF',
ADD COLUMN     "status" "LibraryStatus" NOT NULL DEFAULT 'READY',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "visibility" "LibraryVisibility" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN     "youtubeId" TEXT,
ALTER COLUMN "fileName" DROP NOT NULL,
ALTER COLUMN "contentType" DROP NOT NULL,
ALTER COLUMN "size" DROP NOT NULL,
ALTER COLUMN "storageKey" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LibraryCategory" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LibraryCategory_ownerId_name_key" ON "LibraryCategory"("ownerId", "name");

-- CreateIndex
CREATE INDEX "LibraryFile_visibility_status_idx" ON "LibraryFile"("visibility", "status");

-- AddForeignKey
ALTER TABLE "LibraryFile" ADD CONSTRAINT "LibraryFile_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LibraryCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryCategory" ADD CONSTRAINT "LibraryCategory_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_libraryCategoryId_fkey" FOREIGN KEY ("libraryCategoryId") REFERENCES "LibraryCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: file đã có trong kho lấy tên file làm tiêu đề và loại theo định dạng.
UPDATE "LibraryFile" SET "title" = COALESCE("fileName", '') WHERE "title" = '';
UPDATE "LibraryFile" SET "kind" = 'SLIDE'
WHERE "contentType" = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
UPDATE "LibraryFile" SET "kind" = 'DOC'
WHERE "contentType" = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
