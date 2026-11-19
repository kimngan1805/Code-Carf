# Code Carf — bản chuẩn bị bảo vệ

Bằng chứng ngày 2026-11-19; commit 105a1656158fc9e1a4164f1dffa76302b91f42f4.

**Chưa hoàn tất #128: cần Rubric chính thức và rà soát của nhóm.**

---

## 1. Code Carf (0:45)

- Bản chuẩn bị bảo vệ — chưa chốt theo Rubric học phần
- Nhóm đã ghi nhận bằng chứng từ GitHub ngày 2026-11-19.
- Mục tiêu trình bày: sản phẩm, cách tổ chức công việc, bằng chứng và giới hạn.

**Ghi chú người nói:** Giới thiệu nhóm và mục tiêu. Bổ sung tên học phần, giảng viên và người trình bày sau khi nhóm xác nhận; không tự suy diễn các thông tin này.

- Bằng chứng: https://github.com/kimngan1805/Code-Carf

---

## 2. Bài toán và phạm vi đã triển khai (1:30)

- Học viên đã có luồng tìm lộ trình, đăng ký, học Room và làm bài tập.
- Giáo viên đã có khu vực tạo nội dung và xem thông tin cuộc thi/vi phạm.
- Nhóm đã tách đường dẫn /hv, /gv và /admin theo vai trò.
- Nhóm chưa coi email thật, AI chấm bài viết tay hay mọi tính năng đang mở là đã hoàn thành.

**Ghi chú người nói:** Nêu đúng phạm vi có bằng chứng. Không khẳng định mọi trang quản trị hoặc mọi luồng cuộc thi đều hoàn chỉnh. Các nhánh chưa merge không đại diện cho bản main.

- Bằng chứng: ../../README.md
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/159
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/160

---

## 3. Tổ chức công việc và trạng thái (1:30)

- GitHub đã ghi nhận 61/105 issue đóng; 44 issue còn mở tại thời điểm chụp.
- Số issue đã bao gồm Epic và kế hoạch; nhóm không quy đổi thành tỷ lệ hoàn thành sản phẩm.
- Nhóm đã chia công việc theo issue, branch và Pull Request.
- Sơn còn #128 cùng hai Epic #24/#49; task con và trạng thái cần được đối chiếu riêng.

**Ghi chú người nói:** Giải thích khác biệt giữa issue đóng, code đã merge và luồng được nghiệm thu. Không tuyên bố có dữ liệu burn-down, velocity hoặc ngày Sprint nếu chưa có biên bản thật.

- Bằng chứng: evidence.json
- Bằng chứng: https://github.com/users/kimngan1805/projects/2

---

## 4. Kiến trúc đã sử dụng (1:30)

- UI và API đã nằm trong ứng dụng Next.js 16 / React 19 / TypeScript.
- Service đã kiểm tra vai trò và điều phối; repository đã truy cập PostgreSQL qua Prisma.
- Dữ liệu đã liên kết User → Enrollment → Path → Room → Exercise → Submission.
- Nhóm đã dùng NextAuth; adapter mock/Judge0 đã tách khỏi luồng nộp bài.

**Ghi chú người nói:** Nêu lý do tách service và repository: kiểm quyền có thể kiểm thử, hạn chế truy vấn trực tiếp từ UI. Nói rõ mock chỉ mô phỏng tích hợp, không thực thi hoặc xác minh code thật.

- Bằng chứng: ../../README.md
- Bằng chứng: ../../prisma/schema.prisma
- Bằng chứng: ../../src/features/grading/adapter.ts

---

## 5. Luồng học viên đã có bằng chứng (2:30)

- Đăng nhập → tìm kiếm không dấu → Path đã publish → đăng ký.
- Room đã được mở theo đăng ký và tiến độ của Room trước; URL trực tiếp vẫn bị kiểm tra.
- Trang bài tập đã có editor, lưu nháp, nộp và hiển thị kết quả.
- Học viên đã gửi được báo lỗi; server đã giới hạn gửi liên tục cùng bài.

**Ghi chú người nói:** Dành khoảng 90 giây cho thao tác thực tế, còn lại giải thích. Dùng kịch bản demo.md. Nếu Judge0 không sẵn sàng, nói rõ mock và chỉ chứng minh luồng UI/API; không kết luận bài làm đúng dựa trên mock.

- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/101
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/152
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/159

---

## 6. Kiểm chứng chất lượng (2:00)

- Bản kiểm tra đã đạt 704 test / 87 file trên máy local có PostgreSQL.
- Nhóm đã dùng lint, TypeScript, Vitest và production build.
- Test đã bao phủ khóa Room, quyền truy cập, token mật khẩu và chống gửi report trùng.
- Kết quả local, CI của từng commit và UAT của stakeholder là ba loại bằng chứng khác nhau.

**Ghi chú người nói:** Mở evidence.json và chỉ đúng commit đã kiểm tra. Số test không phải độ bao phủ. Không khẳng định đã đạt UAT, tải lớn hoặc an toàn tuyệt đối khi chưa có báo cáo riêng.

- Bằng chứng: evidence.json
- Bằng chứng: ../../docs/testing.md
- Bằng chứng: ../../src/features/exercise-reports/service.test.ts

---

## 7. Đóng góp và phối hợp đã ghi nhận (1:30)

- Sơn đã có PR về đăng ký Path, mở khóa Room, trang Room, quên mật khẩu, báo lỗi và tìm kiếm.
- Bằng chứng đã được liên kết bằng PR #97, #101, #114, #137, #152 và #159.
- Nhóm đã dùng Conventional Commits và PR để tích hợp thay đổi.
- Tình trạng review phải đọc từ từng PR; việc merge tự nó không chứng minh đã có người khác review.

**Ghi chú người nói:** Chỉ trình bày phần mình giải thích được. Không lấy toàn bộ số commit trên các nhánh backup để tính đóng góp, vì rebase tạo SHA khác cho cùng thay đổi. Mời Nhi bổ sung phần phối hợp theo phân công thật.

- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/97
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/101
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/114
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/137
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/152
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/159

---

## 8. Rủi ro và giới hạn đã nhận diện (1:30)

- Local đã dùng PostgreSQL 16 cổng 5433; Docker cần chạy trước migration và integration test.
- GRADER_ADAPTER=mock đã giúp demo không cần Judge0, nhưng không chạy code thực.
- Email local đã ghi link vào log; email thật vẫn cần tích hợp #109.
- Nhóm chưa có bằng chứng trong bộ này cho tải lớn, UAT hay kết quả AI chấm bài viết tay.

**Ghi chú người nói:** Trình bày rủi ro như trạng thái thực tế, không sáng tác một biên bản quản trị rủi ro đã được phê duyệt. Với deploy, Supabase/Render chỉ được trình bày là cấu hình dự án trừ khi có bằng chứng hoạt động thực tế.

- Bằng chứng: ../../docs/deployment.md
- Bằng chứng: ../../docs/password-reset-development.md
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/issues/109

---

## 9. Tự đánh giá — chờ Rubric chính thức (1:45)

- Nhóm đã lập bảng đối chiếu bằng chứng trong rubric.md.
- Rubric học phần và trọng số chưa được cung cấp cho bản chuẩn bị này.
- Nhóm chưa gán điểm, tỷ lệ hay mức đạt cho tiêu chí không có căn cứ.
- Cần đối chiếu Rubric thật, điền điểm có dẫn chứng và để cả nhóm rà soát trước khi nộp.

**Ghi chú người nói:** Trang này là chỗ giữ cho phần đánh giá bắt buộc, chưa phải bảng điểm đã hoàn tất. Khi nhận Rubric phải cập nhật tên tiêu chí, trọng số, giới hạn điểm và bằng chứng tương ứng.

- Bằng chứng: rubric.md
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/issues/128

---

## 10. Kế hoạch hoàn thiện và demo dự phòng (1:30)

- Nhóm đã chuẩn bị kịch bản demo theo phút và phương án offline.
- Cần rà luồng Teacher xử lý report #47 và thông báo #48; không ghi nhận nhánh chờ merge là đã xong.
- Cần hoàn tất Rubric, phân vai nói, chạy thử 16 phút và xác nhận của nhóm.
- Bộ hiện tại đã tách bằng chứng đã có khỏi phần chưa được kiểm chứng.

**Ghi chú người nói:** Kết thúc bằng các việc còn thiếu cụ thể. Nếu bị hỏi tính năng chưa xong, mở issue thay vì diễn giải như tính năng đã tồn tại. Dành phần hỏi đáp ngoài 16 phút nếu quy định học phần cho phép.

- Bằng chứng: demo.md
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/issues/47
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/issues/48
