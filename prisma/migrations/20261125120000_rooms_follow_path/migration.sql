-- Bài học không còn trạng thái nháp riêng: bài trong lộ trình đã xuất bản luôn mở cho học viên.
-- Sửa dữ liệu cũ: mọi bài còn nháp trong lộ trình đang xuất bản được xuất bản theo lộ trình.
UPDATE "Room"
SET "published" = true
WHERE "published" = false
  AND "pathId" IN (SELECT "id" FROM "Path" WHERE "published" = true);
