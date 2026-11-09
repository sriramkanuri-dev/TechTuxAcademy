-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('LESSON_NOTES', 'COMMAND_CHEATSHEET');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('QUEUED', 'GENERATING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "LessonResource" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ResourceStatus" NOT NULL DEFAULT 'QUEUED',
    "outdated" BOOLEAN NOT NULL DEFAULT false,
    "contentHash" TEXT,
    "error" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonResource_status_idx" ON "LessonResource"("status");

-- CreateIndex
CREATE INDEX "LessonResource_outdated_idx" ON "LessonResource"("outdated");

-- CreateIndex
CREATE INDEX "LessonResource_generatedAt_idx" ON "LessonResource"("generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LessonResource_lessonId_resourceType_key" ON "LessonResource"("lessonId", "resourceType");

-- AddForeignKey
ALTER TABLE "LessonResource" ADD CONSTRAINT "LessonResource_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
