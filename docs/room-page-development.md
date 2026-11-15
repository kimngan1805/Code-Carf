# Learner Room page (#13)

Run `npm run db:seed`, start the app, and sign in as `student@local.test` with the configured seed password. Open `/hv/paths/nhap-mon-lap-trinh`, then **Hàm và tham số** (room six). This open room has Markdown theory, a code example, a table and three exercise examples:

- Tổng hai số: Chưa làm.
- Kiểm tra số chẵn: Đã nộp (a rejected practice submission).
- Tìm số lớn nhất: Đạt (an accepted practice submission).

The examples use stable IDs; rerunning seed does not duplicate them or remove real submissions. Existing real attempts can change the resulting state. No room-completion record is fabricated by this page; exercise progress is separate from RoomProgress.

Expand **Xem đề bài**, use **Cập nhật trạng thái** after an external submission, and check desktop/375px. Long code and tables scroll inside the theory panel rather than expanding the page. Raw HTML is ignored, and unsafe link protocols are rejected by the Markdown renderer.

Open the seventh room by its URL to see the predecessor lock explanation. An authenticated user who has not enrolled sees an enrollment explanation instead. Neither view queries/returns theory, exercise prompts, test cases or submission statuses. The room API keeps returning 403 for locked rooms. Missing and unpublished rooms show the not-found UI. Teacher previews remain under `/gv/paths/...`.

`loading.tsx` supplies an accessible skeleton during server navigation; `error.tsx` uses this Next.js version's `retry()` error-boundary API to fetch again. Browser checks verify the skeleton while a Room query waits, the fallback when a Room query fails, and retry after restoring that query. Simulate Room-only errors in an isolated local test database while keeping authentication available; a full database outage can also fail parent layouts. Do not introduce public test query flags to simulate errors.

State is computed from the current learner's submissions with `contestId = null`: any ACCEPTED = passed; any other submission = submitted; none = not started. The API selects prompts and display fields only, never hidden tests, source code or grading rubrics. Grouped queries avoid returning submission history.
