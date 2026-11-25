-- CreateTable
CREATE TABLE "RoomAttachment" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomAttachment_storageKey_key" ON "RoomAttachment"("storageKey");

-- CreateIndex
CREATE INDEX "RoomAttachment_roomId_position_idx" ON "RoomAttachment"("roomId", "position");

-- AddForeignKey
ALTER TABLE "RoomAttachment" ADD CONSTRAINT "RoomAttachment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
